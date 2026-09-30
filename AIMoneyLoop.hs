{-# LANGUAGE NamedFieldPuns #-}

-- =====================================================================
-- Trabajo Práctico Integrador - Programación Funcional
-- Doctorado en Informática - Equipo LambdaUTN
--
-- Entrega 2: Modelo + prototipo funcional
-- Escenario: propagación del shock de precios de memoria RAM/HBM
-- (evento ancla: revisión de TrendForce del 2 de febrero de 2026)
-- sobre la red de dependencias públicas del ecosistema de IA.
--
-- Este módulo implementa:
--   1. Los tipos algebraicos del grafo de dependencias (nodos y aristas
--      multicapa: comercial, capital, colateral).
--   2. La función pura que calcula el índice de relación R_ij
--      (modelo de "pesos estructurales fijos").
--   3. El modelo "sin red" (baseline sin propagación).
--   4. La función pura de propagación de un shock por el grafo.
--   5. El esqueleto de la interfaz hacia el modelo de "pesos aprendidos"
--      (coeficiente de atención de una GAT), dejado como stub tipado
--      porque el entrenamiento numérico se resuelve en un lenguaje con
--      soporte maduro de autodiferenciación (ver nota al final).
--   6. Estructuras del estudio de eventos (ventanas, retorno anormal).
--
-- Todas las funciones de negocio son puras: dado el mismo grafo y los
-- mismos parámetros, siempre producen el mismo resultado. El grafo en
-- sí es inmutable: "modificarlo" significa construir y devolver una
-- copia nueva, nunca mutar la existente.
-- =====================================================================

module AIMoneyLoop where

import Data.Map (Map)
import qualified Data.Map as Map
import Data.List (foldl')

-- =====================================================================
-- 1. TIPOS DE DATOS (Nodos y Aristas del grafo, inmutables)
-- =====================================================================

-- | Nivel de confianza de un dato. Los atributos extraídos directamente
-- de un 10-K/10-Q son 'Alta'; los estimados a partir de anuncios de
-- prensa sobre clientes privados (OpenAI, Anthropic, xAI, Mistral) se
-- marcan 'Baja' y nunca alimentan el cálculo de la pérdida de
-- entrenamiento, solo features de entrada.
data Confianza = Alta | Baja deriving (Show, Eq)

-- | Atributos intrínsecos de un nodo (empresa pública), extraídos de
-- sus estados contables trimestrales (10-Q) o anuales (10-K) en SEC EDGAR.
data DatosFinancieros = DatosFinancieros
  { ingresosTotales      :: Double      -- I_i, en millones USD
  , capMercado           :: Double      -- M_i, en millones USD
  , deudaTotal           :: Double      -- D_i, en millones USD
  , fechaReporte         :: String      -- Trimestre fiscal del dato (ej. "2026-Q1")
  , demandaComprometida  :: Maybe (Double, Confianza)
    -- ^ Atributo "frontera": compromiso de compra anunciado por un
    -- cliente privado (sin nodo propio en el grafo), en millones USD,
    -- junto con su nivel de confianza. Nothing si no aplica.
  } deriving (Show, Eq)

-- | Atributos de una arista dirigida i -> j, separados en las tres
-- capas del grafo multicapa (Sección "Estructura del grafo").
data RelacionCruzada = RelacionCruzada
  { volumenVentas :: Double  -- V_ij: capa comercial (ventas de i a j)
  , accionesPoder :: Double  -- E_ji: capa de capital (acciones de j en poder de i)
  , colateralGpu  :: Double  -- G_ij: capa de colateral (hardware entregado como garantía)
  } deriving (Show, Eq)

-- | El grafo como mapa de adyacencia inmutable: cada empresa origen
-- apunta a su lista de destinos con la relación correspondiente.
type GrafoAI = Map String (DatosFinancieros, [(String, RelacionCruzada)])

-- =====================================================================
-- 2. MODELO A: "SIN RED" (baseline sin propagación)
-- =====================================================================

-- | El modelo más simple: el impacto de un shock sobre una empresa es
-- el shock mismo si la empresa es el origen, y cero para todas las demás.
-- Sirve como piso de comparación: cualquier modelo de red debería
-- superar a este baseline para justificar la complejidad añadida.
impactoSinRed :: String -> Double -> String -> Double
impactoSinRed origen shock nodo
  | nodo == origen = shock
  | otherwise      = 0.0

-- =====================================================================
-- 3. MODELO B: "PESOS ESTRUCTURALES FIJOS" (función pura R_ij)
-- =====================================================================

-- Pesos fijos de la fórmula, calibrados con el criterio estándar de
-- riesgo sistémico descrito en la Entrega 1 (deben sumar 1.0).
wc, wa, wf :: Double
(wc, wa, wf) = (0.50, 0.30, 0.20)

-- | Índice de relación R_ij con pesos fijos. División protegida contra
-- denominador cero (empresa sin ingresos, capitalización o deuda
-- reportada en ese trimestre).
calcularRij :: DatosFinancieros -> DatosFinancieros -> RelacionCruzada -> Double
calcularRij origen destino relacion =
  let ratioC = safeDiv (volumenVentas relacion) (ingresosTotales origen)
      ratioA = safeDiv (accionesPoder relacion) (capMercado destino)
      ratioF = safeDiv (colateralGpu relacion)  (deudaTotal destino)
      resultado = (wc * ratioC + wa * ratioA + wf * ratioF) * 100
  in clamp 0.0 100.0 resultado

safeDiv :: Double -> Double -> Double
safeDiv _ 0 = 0
safeDiv x y = x / y

clamp :: Double -> Double -> Double -> Double
clamp lo hi x = max lo (min hi x)

-- | Matriz de relaciones completa (lista de aristas con su R_ij),
-- generada de forma declarativa recorriendo el grafo.
type MatrizRelaciones = [(String, String, Double)]

generarMatrizFija :: GrafoAI -> MatrizRelaciones
generarMatrizFija grafo =
  [ (origen, destino, calcularRij datosOrigen datosDestino relacion)
  | (origen, (datosOrigen, conexiones)) <- Map.toList grafo
  , (destino, relacion) <- conexiones
  , let datosDestino = fst (Map.findWithDefault (datosVacios, []) destino grafo)
  ]

datosVacios :: DatosFinancieros
datosVacios = DatosFinancieros 0 0 0 "" Nothing

-- =====================================================================
-- 4. PROPAGACIÓN DE UN SHOCK (función pura, por pasos)
-- =====================================================================

-- | Estado de impacto de cada nodo en un instante de la simulación.
type EstadoImpacto = Map String Double

-- | Un paso de propagación: cada nodo recibe una fracción del impacto
-- de sus vecinos entrantes, ponderada por R_ij (o por el coeficiente
-- de atención, según qué matriz de pesos se le pase). No muta nada:
-- construye y devuelve un nuevo EstadoImpacto.
pasoPropagacion :: GrafoAI -> MatrizRelaciones -> EstadoImpacto -> EstadoImpacto
pasoPropagacion grafo pesos estadoActual =
  let nodos = Map.keys grafo
      impactoRecibido nodo =
        sum [ (Map.findWithDefault 0 origen estadoActual) * (peso / 100)
            | (origen, destino, peso) <- pesos
            , destino == nodo
            ]
  in Map.fromList [ (n, Map.findWithDefault 0 n estadoActual + impactoRecibido n) | n <- nodos ]

-- | Propaga un shock inicial en 'origen' durante 'pasos' iteraciones.
-- Devuelve el estado final; el histórico completo se puede obtener
-- reemplazando foldl' por scanl' si se necesita graficar la evolución.
propagarShock :: GrafoAI -> MatrizRelaciones -> String -> Double -> Int -> EstadoImpacto
propagarShock grafo pesos origen shockInicial pasos =
  let estadoInicial = Map.insert origen shockInicial
                        (Map.fromList [ (n, 0) | n <- Map.keys grafo ])
  in foldl' (\est _ -> pasoPropagacion grafo pesos est) estadoInicial [1 .. pasos]

-- =====================================================================
-- 5. MODELO C: "PESOS APRENDIDOS" (interfaz hacia la GAT)
-- =====================================================================

-- | Firma pura del coeficiente de atención que reemplazará a R_ij en el
-- modelo de pesos aprendidos. Esta función NO se implementa en Haskell
-- puro en este prototipo: el entrenamiento por descenso de gradiente
-- de W y del vector de atención 'a' requiere autodiferenciación sobre
-- tensores, para lo cual el equipo evaluará dos caminos (a decidir en
-- la sección de arquitectura del paper):
--   (a) hasktorch (bindings de libtorch), manteniendo todo el pipeline
--       en Haskell.
--   (b) exportar 'generarMatrizFija' y el dataset de eventos hacia
--       Python + PyTorch Geometric, y reimportar la matriz de
--       coeficientes de atención entrenada como reemplazo de 'pesos'
--       en 'propagarShock'.
-- Se deja el tipo fijado para que el resto del pipeline (propagación,
-- estudio de eventos) sea agnóstico a qué modelo generó los pesos.
coeficienteAtencion :: DatosFinancieros -> DatosFinancieros -> RelacionCruzada -> Double
coeficienteAtencion = calcularRij
-- ^ Placeholder: por ahora delega en el modelo de pesos fijos para que
-- el pipeline compile y sea ejecutable de punta a punta. Se reemplaza
-- por la salida real del entrenamiento una vez implementado (a) o (b).

-- =====================================================================
-- 6. ESTUDIO DE EVENTOS (estructuras; el cálculo estadístico se hace
--    sobre las series de retornos importadas, no se implementa aquí)
-- =====================================================================

-- | Definición del evento ancla y sus ventanas, según lo acordado:
-- ventana de estimación de 120 días hábiles terminando 10 días antes
-- del evento, ventana de evento [-2, +10] días hábiles.
data DatosEvento = DatosEvento
  { fechaEvento          :: String  -- "2026-02-02"
  , diasEstimacion       :: Int     -- 120
  , finEstimacionOffset  :: Int     -- -10 (días hábiles antes del evento)
  , ventanaEventoInicio  :: Int     -- -2
  , ventanaEventoFin     :: Int     -- +10
  } deriving (Show, Eq)

eventoShockHBM :: DatosEvento
eventoShockHBM = DatosEvento
  { fechaEvento         = "2026-02-02"
  , diasEstimacion      = 120
  , finEstimacionOffset = -10
  , ventanaEventoInicio = -2
  , ventanaEventoFin    = 10
  }

-- | Retorno anormal para un día: retorno observado menos el retorno
-- esperado por el modelo de mercado de un factor (beta * retorno del
-- índice de referencia, el Philadelphia Semiconductor Index). Los
-- retornos en sí se importan desde el pipeline de datos (Yahoo
-- Finance / Stooq); esta función solo encapsula la fórmula pura.
retornoAnormal :: Double -> Double -> Double -> Double
retornoAnormal retornoObservado beta retornoIndice =
  retornoObservado - (beta * retornoIndice)

-- | Retorno anormal acumulado (CAR) sobre una lista de retornos
-- anormales diarios dentro de la ventana de evento.
retornoAnormalAcumulado :: [Double] -> Double
retornoAnormalAcumulado = sum

-- =====================================================================
-- 7. DATASET INICIAL (10 empresas públicas del ecosistema)
-- =====================================================================
-- NOTA METODOLÓGICA: las cifras de esta función son placeholders de
-- desarrollo (mismo orden de magnitud que lo reportado, pero no
-- copiadas directamente de un 10-Q). Antes de la redacción final del
-- paper se reemplazan por los valores reales extraídos de SEC EDGAR
-- para cada trimestre de la ventana 2025-2026. OpenAI, Anthropic, xAI
-- y Mistral NO tienen nodo propio (son privadas); su influencia entra
-- únicamente como 'demandaComprometida' en el nodo público que
-- corresponda (ver Diagrama 2).

obtenerEcosistema :: GrafoAI
obtenerEcosistema = Map.fromList
  [ ("NVIDIA", (DatosFinancieros 96200 4500000 12000 "2026-Q2"
        (Just (100000, Baja)), -- compromiso estimado de inversión en OpenAI
        [ ("CoreWeave", RelacionCruzada 2000 1500 3000)
        , ("Microsoft",  RelacionCruzada 25000 0 0)
        , ("Oracle",     RelacionCruzada 9000 0 0)
        ]))
  , ("TSMC", (DatosFinancieros 28000 1000000 8000 "2026-Q1" Nothing,
        [ ("NVIDIA", RelacionCruzada 12000 0 0) ]))
  , ("SK_Hynix", (DatosFinancieros 27980 90000 4000 "2026-Q1" Nothing,
        [ ("NVIDIA", RelacionCruzada 4500 0 0) ]))
  , ("Micron", (DatosFinancieros 21750 110000 9000 "2026-Q1" Nothing,
        [ ("NVIDIA", RelacionCruzada 3800 0 0) ]))
  , ("Samsung", (DatosFinancieros 60000 380000 30000 "2026-Q1" Nothing,
        [ ("NVIDIA", RelacionCruzada 3200 0 0) ]))
  , ("Microsoft", (DatosFinancieros 65000 3100000 95000 "2026-Q2"
        (Just (13000, Baja)), -- créditos Azure comprometidos con OpenAI
        [ ("NVIDIA", RelacionCruzada 0 0 0) ]))
  , ("Oracle", (DatosFinancieros 13300 490000 86000 "2026-Q2" Nothing,
        [ ("NVIDIA", RelacionCruzada 0 0 0) ]))
  , ("CoreWeave", (DatosFinancieros 3500 25000 6000 "2026-Q1" Nothing,
        [ ("Microsoft", RelacionCruzada 1200 0 0) ]))
  , ("ASML", (DatosFinancieros 7500 340000 5000 "2026-Q1" Nothing,
        [ ("TSMC", RelacionCruzada 3000 0 0) ]))
  , ("Broadcom", (DatosFinancieros 14000 900000 15000 "2026-Q2" Nothing,
        [ ("NVIDIA", RelacionCruzada 0 0 0) ]))
  ]

-- =====================================================================
-- 8. FUNCIÓN PRINCIPAL: pipeline de punta a punta con datos placeholder
-- =====================================================================

main :: IO ()
main = do
  let ecosistema      = obtenerEcosistema
      matrizFija       = generarMatrizFija ecosistema
      impactoFinalFijo = propagarShock ecosistema matrizFija "SK_Hynix" 100.0 5
      impactoSinRedMap = Map.fromList
        [ (n, impactoSinRed "SK_Hynix" 100.0 n) | n <- Map.keys ecosistema ]

  putStrLn "=== MATRIZ DE RELACIONES (MODELO: PESOS FIJOS) ==="
  mapM_ (\(o, d, p) -> putStrLn (o ++ " -> " ++ d ++ " = " ++ show (roundTo 2 p) ++ "%"))
        matrizFija

  putStrLn "\n=== EVENTO ANCLA DEL ESTUDIO ==="
  print eventoShockHBM

  putStrLn "\n=== IMPACTO TRAS SHOCK EN SK_Hynix (5 pasos) ==="
  putStrLn "-- Modelo sin red --"
  mapM_ print (Map.toList impactoSinRedMap)
  putStrLn "-- Modelo pesos fijos --"
  mapM_ print (Map.toList impactoFinalFijo)

roundTo :: Int -> Double -> Double
roundTo n f = fromInteger (round (f * (10 ^ n))) / (10 ^ n)
