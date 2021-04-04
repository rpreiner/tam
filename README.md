# Topographic Attribute Maps

Demo Implementation for Publication  
*Augmenting Node-Link Diagrams with Topographic Attribute Maps*  
https://diglib.eg.org/handle/10.1111/cgf13987 <br>
Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer

### Run the Demo

The Webdemo can be directly run by opening the index.htm file in the Firefox browser (last tested on Version 86.0).
Make sure the security settings of your browser allow reading local files. (about:config -> ```privacy.file_unique_origin = false```)

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

### Use your own GEDCOM file
After [downloading and installing python](https://www.python.org/downloads/) you can use the command line script ged2json.py to convert a GEDCOM file into a JSON file:

    python ged2json <GEDCOM file> <JSON file>
	
In order only to have valid JSON entries for TAM the GEDCOM records will be filtered. 
Records that do not state at least one parent are obmitted. If no birth year is given, birth of a child - 20 will be used. 
This currently only works if at least children have birth years.

Use the generated JSON file to replace the file MA.json in the data directory. Then just reload index.htm 
in your browser in order to see the persons from the GEDCOM file. Since TAM only is a 
demonstration the performance and the user experience can decrease dramatically when using files with
too many records in them.
