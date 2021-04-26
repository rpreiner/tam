# Topographic Attribute Maps

Demo Implementation for Publication  
*Augmenting Node-Link Diagrams with Topographic Attribute Maps*  
https://diglib.eg.org/handle/10.1111/cgf13987 <br>
Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer

### Changelog

* version 1.17:&nbsp;&nbsp; Node info tooltip functionality merged from extra3
* version 1.16:&nbsp;&nbsp; Node positioning bugfix

### Run the Demo

The Webdemo can be directly run by opening the index.htm file in the Firefox browser (last tested on Version 86.0).
Make sure the security settings of your browser allow reading local files. (about:config -> ```privacy.file_unique_origin = false```)

### Data Loading

For static loading, the file to be loaded is specified in the ``PARAM_FILENAME`` parameter at the end of index.htm. 
The file can now also be dynamically loaded by the user using a file chooser (thanks to Idefix!).

Two file types and corresponding TAM views are possible:

If the graph is provided in **JSON** format, a TAM view for general graphs is created.
See the default example in 'data/MA.json' to see how to specify an attributed graph. 

If the graph is provided in **GEDCOM** format, a specific ancestry graph view is created that compacts siblings into family circles. 
Note that if birth dates are missing for persons in the graph, they are estimated based on their relatives according to an assumed procreation age.
This age is defined in the ``PARAM_PROCREATION_AGE`` parameter at the end of index.htm.

The force-layout and TAM parameters are set by default to produce the following TAMs of Marie Antoinette:

<table width="1000" cellspacing="0" cellpadding="0"><tr><td>
	<img align="center" src="/images/marie-antoinette.png" width="427">
</td><td>
	<img align="center" src="/images/marie-antoinette-2.png" width="460">
</td></tr></table>

Left: MA.json, right: MA.ged


### Controls

The behaviour and appearance of the graph is controlled by the menu on the left, which is structured into different parameter groups that can be expanded and collapsed by clicking onto the panel title.

Initially the D3 force layout can be interactively modified by picking and pulling individual nodes 
and by using the "Force Layout" controls in the menu. Use to "Graph Appearance" menu to adjust its visual settings.

Use the 'F' key or the menu switch to freeze the current force layout and compute the underlying TAM. 
Use the 'F' key again to unfreeze and re-energize the layout simulation. While freezed, individual nodes can still 
be repositioned by picking and pulling with the mouse. One the TAM is visible, its visual appearance can be adjusted 
in the "Map Appearance" menu.

Use the 'H' key or the menu switch to activate contour hilighting on mouse-over.

Use the mousewheel to zoom in or zoom out and click-and-drag to pan the viewport.


### Image Export

The currently visible TAM can be exported as Scalable Vector Graphics (SVG) file, by clicking the "SVG" button, 
or hitting the 'E' key. SVGs can be opened in the browser and viewed at any zoom level.
