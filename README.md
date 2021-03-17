# Topographic Attribute Maps

Demo Implementation for Publication  
*Augmenting Node-Link Diagrams with Topographic Attribute Maps*  
https://diglib.eg.org/handle/10.1111/cgf13987
Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer

### Run the demo

The Webdemo can be directly run by opening the index.htm file in the Firefox browser (last tested on Version 89.0).

### Data Loading

The graph data is provided in JSON format, the path to be loaded is specified at the end of index.htm.
See the default example in 'data/MA.json' to see how to specify an attributed graph. 

The force-layout and TAM parameters are set by default to produce this TAM of Marie Antoinette:

<img align="center" src="/images/marie-antoinette.png" width="600">


### Controls

Initially the D3 force layout can be interactively modified by picking and pulling individual nodes 
and by using the force strength controls in the menu.

Use the 'E' key to freeze the current force layout and compute the underlying TAM. Use the 'E' key 
again to unfreeze and re-energize the layout simulation. While freezed, individual nodes can still 
be repositioned by picking and pulling with the mouse.

Use the 'I' key or the menu switch to activate contour hilighting on mouse-over.

Use the mousewheel to zoom in or zoom out and click-and-drag to pan the viewport.
