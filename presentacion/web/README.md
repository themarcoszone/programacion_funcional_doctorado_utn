# Presentación interactiva — Jornada de doctorado

Abrí `index.html` en un navegador moderno. Funciona sin internet, instalación ni servidor. Conservá la carpeta junto a `../image.png`, que contiene la figura original.

## Controles

Los títulos y rótulos del índice siguen los nombres de las secciones del Markdown. Las secciones divididas en varias diapositivas conservan el nombre y agregan el tema específico.

- Flechas izquierda/derecha, espacio o PageUp/PageDown: navegar.
- Inicio/Fin: primera/última diapositiva.
- Botón Inicio: vuelve a la primera diapositiva, también disponible dentro del índice. “Volver a la presentación” cierra el índice conservando la diapositiva actual.
- I: índice. F: pantalla completa. Escape: salir del índice o pantalla completa.
- Los controles de formulario conservan sus teclas habituales.
- Cada diapositiva tiene un enlace directo, por ejemplo `index.html#10`.
- Imprimir desde el navegador permite exportar todas las diapositivas a PDF; sugerencia: horizontal y sin encabezados/pies del navegador.

## Guion sugerido para 30 minutos

| Diapositivas | Tema | Tiempo |
| --- | --- | --- |
| 1–3 | Motivación y pregunta | 4 min |
| 4–6 | Objetivo, antecedentes y representación | 4 min |
| 7–9 | Ecosistema, pesos y núcleo funcional | 5 min |
| 10 | Demostración interactiva | 4 min |
| 11–14 | Datos, estudio de eventos, atención y pérdida | 5 min |
| 15–17 | Implementación, diseño experimental y métricas | 5 min |
| 18–20 | Estado del prototipo, trabajo futuro y cierre | 3 min |

Para la demo: empezar en SK_Hynix con 100 unidades, avanzar dos pasos y observar NVIDIA y sus clientes. Cambiar a “Sin red” en el mismo paso para comparar. Probar ASML para mostrar un camino indirecto más largo. Los clics sobre los nodos cambian el origen y vuelven al paso cero.

## Contenido y alcance

Adaptación editorial de `../presentacion.md`, sin modificar el Markdown. `styles.css` define la apariencia; `app.js` controla la navegación y la simulación. No usa bibliotecas ni fuentes externas.

La demo reproduce los datos de desarrollo, los pesos 0,50 / 0,30 / 0,20 y la actualización simultánea de `../../AIMoneyLoop.hs`. Se mantienen incluso las aristas con peso cero. El shock se expresa en unidades abstractas; las iteraciones no son días ni rendimientos financieros. El esquema acumulativo puede amplificar el impacto; la interfaz limita la exploración a ocho pasos.

No se simula una GAT entrenada: el prototipo Haskell todavía delega la atención a los pesos fijos. La evaluación temporal, las ablaciones y la definición de métricas se presentan como pasos propuestos, no como resultados obtenidos. Se conservan las menciones a autores del documento; faltan referencias bibliográficas completas y la fuente primaria del evento ancla.

Transiciones: fundido cruzado con desplazamiento horizontal leve (300 ms de salida y 480 ms de entrada). La dirección acompaña el avance o retroceso. Los cambios rápidos cancelan la transición anterior; la preferencia del sistema de reducir movimiento desactiva el efecto.

Verificación realizada: estructura HTML, recursos locales, sintaxis JavaScript y comprobaciones numéricas del núcleo de propagación. Queda pendiente la revisión visual en un navegador y de la exportación a PDF.
