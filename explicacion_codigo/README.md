# AIMoneyLoop.hs explicado por bloques

Lectura del [código fuente](../AIMoneyLoop.hs), siguiendo su orden. Los fragmentos se centran en la implementación; algunos omiten campos para abreviar.

## Bloque inicial: módulo e imports

```haskell
module AIMoneyLoop where

import Data.Map (Map)
import qualified Data.Map as Map
import Data.List (foldl')
```

`module` nombra el módulo. Al no indicar una lista de exportación, expone sus definiciones. El primer import permite escribir el tipo `Map`; el segundo permite llamar operaciones como `Map.fromList` sin confundirlas con funciones de listas. `foldl'` se usa para repetir la transición del estado.

La directiva `NamedFieldPuns` habilita una abreviación para trabajar con registros, pero el código actual no la utiliza.

## 1. Tipos de datos: definir qué forma tienen los valores

```haskell
data Confianza = Alta | Baja deriving (Show, Eq)
```

`data` crea un tipo nuevo. `Alta` y `Baja` son sus dos constructores: un valor de `Confianza` debe ser uno de ellos. `deriving` genera las implementaciones para mostrar valores (`Show`) y compararlos (`Eq`).

`DatosFinancieros` y `RelacionCruzada` se declaran como registros: constructores con campos nombrados. Un campo también genera una función de acceso; por ejemplo, `ingresosTotales datos` devuelve el ingreso del registro `datos`.

```haskell
demandaComprometida :: Maybe (Double, Confianza)
```

El campo puede contener `Nothing` o un valor como `Just (100000, Baja)`. Los paréntesis forman una tupla de importe y confianza. Este campo se almacena, pero no se usa en los cálculos actuales.

```haskell
type GrafoAI = Map String (DatosFinancieros, [(String, RelacionCruzada)])
```

`type` crea un alias, no un tipo nuevo. Se lee de afuera hacia adentro:

- `Map String ...`: cada clave es el nombre de una empresa.
- `(DatosFinancieros, ...)`: su valor es una tupla con datos y conexiones.
- `[(String, RelacionCruzada)]`: las conexiones son una lista de tuplas destino–relación.

## 2. Modelo sin red: función con guardas

```haskell
impactoSinRed :: String -> Double -> String -> Double
impactoSinRed origen shock nodo
  | nodo == origen = shock
  | otherwise      = 0.0
```

`::` introduce el tipo. Hay tres argumentos —origen, shock y nodo consultado— y el último `Double` es el resultado. Las guardas (`|`) prueban condiciones en orden; `otherwise` equivale a `True` y cubre el caso restante.

Por ejemplo, `impactoSinRed "A" 100 "B"` devuelve `0.0`.

## 3. Pesos fijos: cálculos locales y recorrido del grafo

### `calcularRij`, `safeDiv` y `clamp`

```haskell
let ratioC = safeDiv (volumenVentas relacion) (ingresosTotales origen)
    ratioA = safeDiv (accionesPoder relacion) (capMercado destino)
    ratioF = safeDiv (colateralGpu relacion) (deudaTotal destino)
    resultado = (wc * ratioC + wa * ratioA + wf * ratioF) * 100
in clamp 0.0 100.0 resultado
```

`let` define nombres locales; `in` indica la expresión que se devuelve. Los accesores extraen los campos de los registros y `safeDiv` calcula cada cociente. `wc`, `wa` y `wf` son constantes con valores `0.50`, `0.30` y `0.20`.

```haskell
safeDiv _ 0 = 0
safeDiv x y = x / y
```

Estas ecuaciones usan coincidencia de patrones: si el segundo argumento es cero se elige la primera. `_` significa que el primero no se necesita. En otro caso se divide normalmente.

`clamp lo hi x = max lo (min hi x)` limita primero el máximo y luego el mínimo; aquí deja el peso entre 0 y 100.

### `generarMatrizFija`

```haskell
[ (origen, destino, calcularRij datosOrigen datosDestino relacion)
| (origen, (datosOrigen, conexiones)) <- Map.toList grafo
, (destino, relacion) <- conexiones
, let datosDestino = fst (Map.findWithDefault (datosVacios, []) destino grafo)
]
```

Es una comprensión de listas. La expresión anterior a `|` construye cada resultado; las cláusulas siguientes proporcionan sus valores:

1. `Map.toList` convierte el mapa en pares clave–valor y el patrón separa origen, datos y conexiones.
2. El segundo `<-` recorre las conexiones de ese origen, separando destino y relación.
3. `Map.findWithDefault` busca el destino; si falta, devuelve `(datosVacios, [])`. `fst` toma los datos financieros de esa tupla.

El resultado es `MatrizRelaciones`, alias de `[(String, String, Double)]`: una lista de aristas con peso, no un arreglo bidimensional. El valor por defecto evita una búsqueda fallida, pero no agrega el destino al grafo.

## 4. Propagación: construir estados nuevos

### `pasoPropagacion`

```haskell
let nodos = Map.keys grafo
    impactoRecibido nodo =
      sum [ (Map.findWithDefault 0 origen estadoActual) * (peso / 100)
          | (origen, destino, peso) <- pesos
          , destino == nodo
          ]
in Map.fromList
     [ (n, Map.findWithDefault 0 n estadoActual + impactoRecibido n)
     | n <- nodos
     ]
```

`EstadoImpacto` es el alias `Map String Double`. `Map.keys` obtiene los nodos que tendrá el nuevo estado.

La función local `impactoRecibido` recorre los pesos. La condición `destino == nodo` filtra las aristas entrantes; para cada una multiplica el impacto del origen por su peso dividido por 100. `sum` reúne esos aportes.

La última comprensión produce pares `(nodo, impactoAnterior + aporte)`. `Map.fromList` los convierte en un mapa nuevo. Todas las lecturas usan `estadoActual`: un aporte recibido no vuelve a transmitirse dentro del mismo paso.

### `propagarShock`

```haskell
let estadoInicial = Map.insert origen shockInicial
                      (Map.fromList [ (n, 0) | n <- Map.keys grafo ])
in foldl' (\est _ -> pasoPropagacion grafo pesos est) estadoInicial [1 .. pasos]
```

La comprensión inicial asigna cero a cada nodo. `Map.insert` devuelve un mapa con el shock asignado al origen, reemplazando su cero.

`\est _ -> ...` es una función anónima: recibe el estado acumulado y un número de paso que ignora. `foldl'` la aplica sucesivamente sobre `[1 .. pasos]`, pasando el resultado de una aplicación a la siguiente. La prima indica que fuerza cada acumulador a su forma externa; no implica evaluar profundamente todo el mapa.

Con cero pasos devuelve el estado inicial; con cinco, devuelve la quinta transición. No conserva el historial. El estado acumula y retransmite impactos, sin descontarlos del origen ni aplicar decaimiento.

## 5. Atención: reutilizar una función existente

```haskell
coeficienteAtencion = calcularRij
```

No llama al cálculo con argumentos concretos: define otro nombre para la misma función. Por eso acepta los mismos tres argumentos. Es un placeholder, no una GAT implementada, y `main` no lo invoca.

El núcleo de propagación recibe una lista de pesos como parámetro. Se podrá cambiar su origen sin modificar la transición; la lista deberá respetar la escala porcentual porque se divide por 100.

## 6. Estudio de eventos: registros y funciones pequeñas

`DatosEvento` define un registro. `eventoShockHBM` construye un valor usando campos nombrados, como `fechaEvento = "2026-02-02"`; no carga un archivo ni ejecuta un estudio.

```haskell
retornoAnormal retornoObservado beta retornoIndice =
  retornoObservado - (beta * retornoIndice)

retornoAnormalAcumulado = sum
```

La primera función recibe tres números y devuelve otro; no estima `beta` y no incluye alfa. La segunda es una definición sin argumentos explícitos: equivale a `retornoAnormalAcumulado retornos = sum retornos`.

Estas funciones están disponibles en el módulo, pero el `main` actual no las utiliza.

## 7. Dataset: construir valores con los constructores

Esta entrada de `obtenerEcosistema` muestra cómo se arma cada elemento:

```haskell
("SK_Hynix", (DatosFinancieros 27980 90000 4000 "2026-Q1" Nothing,
    [ ("NVIDIA", RelacionCruzada 4500 0 0) ]))
```

La clave es `"SK_Hynix"`. Su valor contiene un registro financiero y una lista con una conexión a NVIDIA. Los constructores también admiten argumentos posicionales: en `DatosFinancieros` siguen el orden ingresos, capitalización, deuda, fecha y demanda opcional.

`obtenerEcosistema` reúne diez entradas de esta forma con `Map.fromList`. Pese al nombre, es un valor de tipo `GrafoAI`, no una operación de lectura: todos los datos de ejemplo están escritos en el archivo.

## 8. `main`: conectar cálculos y ejecutar efectos

```haskell
main :: IO ()
main = do
  let ecosistema = obtenerEcosistema
      matrizFija = generarMatrizFija ecosistema
      impactoFinalFijo = propagarShock ecosistema matrizFija "SK_Hynix" 100.0 5
```

`IO ()` indica una acción con efectos cuyo resultado útil es la unidad `()`. `do` ordena las acciones de salida. El `let` dentro de `do` define valores puros y no lleva `in`; por evaluación perezosa, nombrarlos no obliga a calcularlos inmediatamente.

`impactoSinRedMap` se construye aparte recorriendo los nodos y aplicando `impactoSinRed`. Después se imprimen los resultados:

```haskell
mapM_ (\(o, d, p) -> putStrLn (o ++ " -> " ++ d ++ " = " ++ show (roundTo 2 p) ++ "%"))
      matrizFija
```

La función anónima desarma cada tupla. `++` concatena textos, `show` convierte el número a texto y `putStrLn` lo imprime. `mapM_` ejecuta esa acción para cada elemento en orden y descarta sus resultados.

`mapM_ print (Map.toList impactoFinalFijo)` hace lo mismo con las tuplas nodo–impacto. `print` usa `Show`, por eso puede imprimir también `eventoShockHBM`.

`roundTo` multiplica por una potencia de diez, usa `round` para obtener un entero, lo convierte con `fromInteger` y vuelve a dividir. Solo se aplica al mostrar los pesos; la simulación conserva los valores originales.

## Cómo ejecutarlo

Desde `codigo`, con GHC instalado:

```bash
cd programacion_funcional_doctorado_utn
ghc AIMoneyLoop.hs -e 'AIMoneyLoop.main'
```

Si ya estás en el repositorio, ejecutá solo la segunda línea. No necesita archivos de entrada: cambiá el escenario en `main` y los datos en `obtenerEcosistema`.

La [presentación de ejecución](web/index.html) y la [salida de ejemplo](web/salida-ejemplo.txt) complementan esta lectura del código.
