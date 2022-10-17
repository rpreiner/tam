# Topographic Attribute Maps

Demo Implementation for Publication  
*Augmenting Node-Link Diagrams with Topographic Attribute Maps*  
https://diglib.eg.org/handle/10.1111/cgf13987 <br>
Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer

### Changelog

* version 1.20:&nbsp;&nbsp; Adding Lifelines visualization functionality as shown in the paper.
* version 1.19:&nbsp;&nbsp; Encoding person sex in family graph nodes (boxes &amp; circles) and node pinning functionality.
* version 1.18:&nbsp;&nbsp; Graph Save and Load functionality merged from [extra3](https://github.com/extra3).

### Run the Demo

The Webdemo can be directly run by opening the index.htm file in the Firefox browser (last tested on Version 86.0).

### Data Loading

For static loading, the file to be loaded is specified in the ``PARAM_FILENAME`` parameter at the end of index.htm. 
To enable static loading, the security settings of your browser need to allow reading local files (about:config -> ```privacy.file_unique_origin = false```).
The file can also be dynamically loaded by the user using a file chooser (thanks to Idefix!).

### TAM Views and File Extensions

Two file types and corresponding TAM views are possible:

If the graph is provided in **JSON**, a TAM view for general graphs is created.
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

The behaviour and appearance of the graph is controlled by the menu on the left, which is structured into different parameter groups 
that can be expanded and collapsed by clicking onto the panel title.

Initially the D3 force layout can be interactively modified by picking and pulling individual nodes with the mouse
and by using the "Force Layout" controls in the menu. Use to "Graph Appearance" menu to adjust its visual settings.

When picking and pulling graph nodes, they will be pinned to the location they have beend dragged to. 
A single click onto pinned nodes will release them from their fixed position and allow them to freely move again.

Use the 'F' key or the menu switch to freeze the current force layout and compute the underlying TAM. 
Use the 'F' key again to unfreeze and re-energize the layout simulation. While freezed, individual nodes can still 
be repositioned by picking and pulling with the mouse. One the TAM is visible, its visual appearance can be adjusted 
in the "Map Appearance" menu.

Use the 'H' key or the menu switch to activate contour hilighting on mouse-over.

Use the mousewheel to zoom in or zoom out and click-and-drag to pan the viewport.


### Saving the Current Graph

With version 1.18, the currently visible TAM layout can be saved to file by clicking the "Graph" button in the "Save" menu.
The current node positions and all layout and appearance parameters will then be saved to a file which is provided as file download to the user.
This file can then be reloaded via the "Load File" menu, and will be restored with their last saved layout.

If the current graph was originally loaded from a JSON file (general graph), the saved file will contain all original data and saved with 
``.tam`` file extension.

If the current graph was built from an originally loaded GEDCOM file (family graph), the file will be saved with ``.tfm`` file extension, and only 
store the graph layout, appearance parameters, and a reference to the original GEDCOM filename that stores the genealogical content. 
Note that in order to load the graph again, the linked GEDCOM file is expected to reside directly inside the ``/data`` subfolder of the tam source tree.

### Extending your GEDCOM

Saving the family graph layout as TFM file allows the user to extend or modify their GEDCOM file independent from the graph visualization.
When loading a TFM file that refers to a modified GEDCOM, stored node positions will only be applied to previously existing persons or families.
Any newly added persons will be shown in a centralized default location. If necessary, unfreeze the graph layout to reactivate the node positioning
and obtain an optimized position for those new members.

### Image Export

The currently visible TAM can be exported as Scalable Vector Graphics (SVG) file, by clicking the "SVG Image" button in the "Save" menu, 
or hitting the 'E' key. SVGs can be opened in the browser and viewed at any zoom level.