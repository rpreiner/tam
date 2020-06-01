///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
///////////////////////////////////////////////////////////////////////////////



///////////////////////////////////////////////////////////////////////////////
// class Field

class Field
{
    constructor(width, height, defaultValue)
    {
        this.width = width;
        this.height = height;
        this.values = new Array(width * height); 
        
        this.values.fill(defaultValue);
    }

    get(x, y) 
    {
        if (this.inRange(x, y))
            return this.values[this.index(x,y)];
        return null;
    }

    set(x, y, value)
    {
        if (this.inRange(x, y))
            this.values[this.index(x,y)] = value;
    }

    index(x, y)
    {
        return Math.trunc(y * this.width + x);
    }

    inRange(x, y)
    {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
}



///////////////////////////////////////////////////////////////////////////////
// class TopoMap

class TopoMap extends Field
{
    constructor(data, interpolationType, resolution, dilationIters, xAccess, yAccess, valueAccess)
    {
        if (data == null)
            return null;

        // specify undefined data accessors
        if (!xAccess) xAccess = function(p) { return p.x };
        if (!yAccess) yAccess = function(p) { return p.y };
        if (!valueAccess) valueAccess = function(p) { return p.value };
        
        //--------------------------------------------------------------------
        // define field extent based on data
        
        // determine map size and required transformation properties
        var xmin, ymin, vmin = xmin = ymin = 1e20;
        var xmax, ymax, vmax = xmax = ymax = -1e20;
        data.forEach(p => {
            var x = xAccess(p);    
            xmin = Math.min(xmin, x);   
            xmax = Math.max(xmax, x);   
            var y = yAccess(p); 
            ymin = Math.min(ymin, y);
            ymax = Math.max(ymax, y);
            var value = valueAccess(p);
            vmin = Math.min(value, vmin);
            vmax = Math.max(value, vmax);
        })

        console.log("Value range in data: " + [vmin, vmax]);

        // add some boundary
        var boundary = Math.min(xmax-xmin, ymax-ymin) * 0.15;
        xmin -= boundary; 
        ymin -= boundary;
        ymax += boundary; 
        xmax += boundary + PARAM_FONT_SIZE * 5;  // some more boundary to the right to account for text

        // define dimensions
        var cellSize = Math.max(xmax-xmin, ymax-ymin) / resolution;
        var width = Math.ceil((xmax - xmin) / cellSize);
        var height = Math.ceil((ymax - ymin) / cellSize);

        console.log("Map dimensions: " + (xmax-xmin) + ", " + (ymax-ymin));

        //--------------------------------------------------------------------
        // initialize class (defining 'this')

        super(width, height, 0);
       
        this.xAccess = xAccess;
        this.yAccess = yAccess;
        this.valueAccess = valueAccess;
        
        // save transformation
        this.origin = {"x": xmin, "y": ymin };
        this.cellSize = cellSize;

        // create scalar field from points
        if (PARAM_INTERPOLATE_NN)
            this.interpolatePointsNaturalNeighbor(data, dilationIters, interpolationType);
        else
            this.interpolatePointsDiffusion(data, dilationIters, interpolationType);
    }
    
    map(x, y) 
    {
        x = (x - this.origin.x) / this.cellSize; 
        y = (y - this.origin.y) / this.cellSize;
        return {'x': x, 'y': y};
    }
   
    // sampling with bilinear interpolation
    sampleBilinear(x, y) 
    {
        // map
        x = (x - this.origin.x) / this.cellSize; 
        y = (y - this.origin.y) / this.cellSize;

        var x0 = Math.floor(x);
        var y0 = Math.floor(y);
        var x1 = x0 + 1;
        var y1 = y0 + 1;
        var tx = x - x0;
        var ty = y - y0;
        
        var v0 = this.get(x0, y0) * (1 - tx) + this.get(x1, y0) * tx; 
        var v1 = this.get(x0, y1) * (1 - tx) + this.get(x1, y1) * tx; 
        var value = v0 * (1 - ty) + v1 * ty;

        if (value == null)
            value = this.get(Math.round(x), Math.round(y));

        return value;
    }

    sampleNearestNeighbor(x, y) 
    {
        // map
        x = Math.round((x - this.origin.x) / this.cellSize);
        y = Math.round((y - this.origin.y) / this.cellSize);
        var value = this.get(x, y); 
        
        return value;
    }


    interpolatePointsNaturalNeighbor(data, dilationIters, interpolationType)
    {
        var INIT_AVG = !PARAM_SHOW_TUNNELS;

        console.log("+++ Starting Natural Neighbors");
        this.values.fill(null);
        var flagField = new Field(this.width, this.height, 0);
        var front = new Array();
       
        // set constraint values
        //---------------------------------------------------------------
        console.log("Setting Constraints");
        data.forEach(p => 
        {
            var value = this.valueAccess(p);
            if (!isNumber(value))
                return;
            var x = Math.round((this.xAccess(p) - this.origin.x) / this.cellSize);
            var y = Math.round((this.yAccess(p) - this.origin.y) / this.cellSize);
            var idx = this.index(x, y);

            if (flagField.values[idx] == 0)
            {
                this.values[idx] = value;
                flagField.values[idx] = 1;
                front.push([x,y]);
            }
            else if (INIT_AVG)
            {
                // averaging
                this.values[idx] += value;
                flagField.values[idx] += 1;
            }
            else
            {
                // if data is present in this cell, take max value
                this.values[idx] = Math.max(this.values[idx], value);
                flagField.values[idx] = 1;
            }
        })

        if (INIT_AVG)
        {
            for (var k = 0; k < this.values.length; k++)
            {
                var sum = this.values[k];
                var count = flagField.values[k];
                if (sum != null && count > 0)
                {
                    this.values[k] /= count;
                    flagField.values = 1;
                }
            }
        }


        // dilate constraint values
        //---------------------------------------------------------------
        console.log("Dilate Constraints");
        
        var dilatedField = new Field (this.width, this.height);
        
        for (var dIters = 0; dIters < dilationIters; dIters++)
        {
            dilatedField.values = this.values.slice(0);

            for (var x = 0; x < this.width; x++)
            for (var y = 0; y < this.height; y++)
            {
                if (INIT_AVG)   //--- FOR AVERAGING
                {
                    if (flagField.get(x, y) == 0)
                    {
                        const w0 = 0.25, w1 = 0.125, w2 = 0.0625;
                        var w = 0;
                        var sum = 0;
                        var a;

                        a = this.get(x-1,y-1); if(a != null) { sum += a*w2; w += w2; } 
                        a = this.get(x,  y-1); if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x+1,y-1); if(a != null) { sum += a*w2; w += w2; }
                        a = this.get(x-1, y);  if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x, y);    if(a != null) { sum += a*w0; w += w0; }
                        a = this.get(x+1, y);  if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x-1,y+1); if(a != null) { sum += a*w2; w += w2; }
                        a = this.get(x, y+1);  if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x+1,y+1); if(a != null) { sum += a*w2; w += w2; }
                        if (w > 0)
                        {
                            dilatedField.set(x, y, sum / w);
                            flagField.set(x, y, 1);
                            front.push([x,y]);
                        }
                    }
                }
                else   //--- FOR AVERAGING
                {
                    var a_self = this.get(x, y); 
                
                    const w0 = 0.25, w1 = 0.125, w2 = 0.0625;
                    var w = 0;
                    var sum = 0;
                    var a;

                    a = this.get(x-1,y-1); if(a > a_self) { sum += a*w2; w += w2; } 
                    a = this.get(x,  y-1); if(a > a_self) { sum += a*w1; w += w1; }
                    a = this.get(x+1,y-1); if(a > a_self) { sum += a*w2; w += w2; }
                    a = this.get(x-1, y);  if(a > a_self) { sum += a*w1; w += w1; }
                    a = this.get(x, y);    if(a > a_self) { sum += a*w0; w += w0; }
                    a = this.get(x+1, y);  if(a > a_self) { sum += a*w1; w += w1; }
                    a = this.get(x-1,y+1); if(a > a_self) { sum += a*w2; w += w2; }
                    a = this.get(x, y+1);  if(a > a_self) { sum += a*w1; w += w1; }
                    a = this.get(x+1,y+1); if(a > a_self) { sum += a*w2; w += w2; }
                    if (w > 0)
                    {
                        dilatedField.set(x, y, sum / w);
                        flagField.set(x, y, 1);
                        front.push([x,y]);
                    }
                }

            }
            this.values = dilatedField.values.slice(0); // copy thickened data back to current field   // TODO: SLICING NECESSARY????
        }

    
        
        // flood fill voronoi centers
        //---------------------------------------------------------------
        const offsets = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
        
        // init source field
        var srcField = new Field(this.width, this.height, null);
        for (var i = 0; i < front.length; i++) {
            const [x,y] = front[i];
            srcField.set(x,y, front[i]);
        }

        // propagate
        console.log("Propagating");
        while(front.length > 0)
        {
            // look at each point in current propagation front
            var newFront = new Array();
            for (var i = 0; i < front.length; i++)
            {
                const [x,y] = front[i];
                const value = this.get(x,y);
                const src = srcField.get(x,y);
                
                // propagate to neighbors
                for (var j = 0; j < offsets.length; j++)
                {
                    const [dx,dy] = offsets[j];
                    const xn = x + dx;
                    const yn = y + dy;
                    if (!this.inRange(xn,yn))
                        continue;

                    // source that reached this neigbhor
                    const srcn = srcField.get(xn, yn);  
                   
                    // update if neighbor doesn't contain data yet
                    var update = srcn == null;
                    
                    // if neighbor already contains data, compare distance of this neighbor to its current source to this point's source
                    if (!update)
                    {
                        const [xsrc, ysrc] = src;
                        const [xsrcn, ysrcn] = srcn;
                        const distFromNSrc  = Math.sqrt(Math.pow(xn - xsrcn, 2) + Math.pow(yn - ysrcn, 2))
                        const distFromMySrc = Math.sqrt(Math.pow(xn - xsrc, 2)  + Math.pow(yn - ysrc, 2))
                        update = distFromMySrc < distFromNSrc;
                    }
                    if (update)
                    {  
                        // set own value and src in neighbor and set neighbor as new front point
                        this.set(xn, yn, value);
                        srcField.set(xn, yn, src);
                        newFront.push([xn, yn]);
                    }
                }
            }

            // set new front current
            front = newFront;
        }
        

        // Perform discrete Natural Neighbor Interpolation at certain subsampling points (performance!)
        //------------------------------------------------------------------------------------------------
        const INTERPOLATION_SUBSAMPLING = 4;

        console.log("Interpolating ", this.width, " x ", this.height, ", 1/", INTERPOLATION_SUBSAMPLING, " Subsampling");
        var indexField = new Field(this.width, this.height, null);
        var smoothedField = new Field (this.width, this.height);
        smoothedField.values = this.values.slice(0);   

        var index = 0;
        for (var xsrc = 0; xsrc < this.width; xsrc += INTERPOLATION_SUBSAMPLING){
            console.log(".");
            for (var ysrc = 0; ysrc < this.height; ysrc += INTERPOLATION_SUBSAMPLING, index++)
            {
                //-- simulate inserting this point as new Voronoi center
                //weightField.values.fill(null);
                indexField.set(xsrc, ysrc, index);
                front = [[xsrc,ysrc]];
                var totalArea = 1;
                var sumValues = this.get(xsrc, ysrc);

                //-- propagating
                while(front.length > 0)
                {
                    // look at each point in current propagation front
                    var newFront = new Array();
                    for (var i = 0; i < front.length; i++)
                    {
                        const [x,y] = front[i];
                        
                        // propagate to neighbors
                        for (var j = 0; j < offsets.length; j++)
                        {
                            const [dx,dy] = offsets[j];
                            const xn = x + INTERPOLATION_SUBSAMPLING * dx;
                            const yn = y + INTERPOLATION_SUBSAMPLING * dy;
                            if (!this.inRange(xn,yn))
                                continue;

                            const localIndex = indexField.get(xn, yn);
                            if (localIndex != index) // not yet visited in current iteration
                            {
                                // source that reached this neigbhor
                                const [xsrcn, ysrcn] = srcField.get(xn, yn);  
                            
                                // compare distance of this neighbor to its current source to this point's source
                                const distFromNSrc  = Math.sqrt(Math.pow(xn - xsrcn, 2) + Math.pow(yn - ysrcn, 2))
                                const distFromMySrc = Math.sqrt(Math.pow(xn - xsrc, 2)  + Math.pow(yn - ysrc, 2))
                                //console.log(distFromMySrc, " < ", distFromNSrc)
                                if (distFromMySrc < distFromNSrc)
                                {  
                                    const w = 1.0 / Math.sqrt(Math.sqrt(totalArea));
                                    sumValues += w * this.get(xn, yn);
                                    totalArea += w;

                                    // mark cell as visited and push to new front
                                    indexField.set(xn, yn, index);
                                    newFront.push([xn, yn]);
                                }
                            }
                        }
                    }
                    // set new front current
                    front = newFront;
                }

                //-- finished propagation
                smoothedField.set(xsrc, ysrc, sumValues / totalArea);
                flagField.set(xsrc, ysrc, 2);   // remember this is an intermediate source value (value 2)
            }
        }
        // copy back smoothed field
        this.values = smoothedField.values.slice(0);   
        
        
        // diffuse
        //--------------------------------
        console.log("Diffusing");
        this.diffuse(flagField, interpolationType);


        // final smooth
        //---------------------------------------------------------------
        console.log("Smoothing");
        for (var i = 0; i < 2 * INTERPOLATION_SUBSAMPLING; i++)
        {
            // smooth unconstrained pixels of current field
            var smoothedField = new Field (this.width, this.height, 0);
            for (var x = 0; x < this.width; x++) 
            for (var y = 0; y < this.height; y++) 
            {
                if (flagField.get(x,y) != 1)     // smooth field value if not a constraint
                {
                    const w0 = 0.25, w1 = 0.125, w2 = 0.0625;
                    var w = 0;
                    var sum = 0;
                    var a;
                    {
                        a = this.get(x-1,y-1); if(a != null) { sum += a*w2; w += w2; } 
                        a = this.get(x,  y-1); if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x+1,y-1); if(a != null) { sum += a*w2; w += w2; }
                        a = this.get(x-1, y);  if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x, y);    if(a != null) { sum += a*w0; w += w0; }
                        a = this.get(x+1, y);  if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x-1,y+1); if(a != null) { sum += a*w2; w += w2; }
                        a = this.get(x, y+1);  if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x+1,y+1); if(a != null) { sum += a*w2; w += w2; }
                        smoothedField.set(x, y, sum / w);
                    }
                }
                else 
                    smoothedField.set(x, y, this.get(x,y));     // copy hard constrained values - introduces artifcats!
            }

            this.values = smoothedField.values.slice(0); // copy smoothed data back to current field
        }
        
        
        console.log("+++ Finished Diffusion");
    }



    interpolatePointsDiffusion(data, dilationIters, interpolationType)
    {
        var INIT_AVG = false; //!PARAM_SHOW_TUNNELS;

        console.log("+++ Starting Diffusion");
        this.values.fill(null);
        var flagField = new Field(this.width, this.height, 0);
       
        // set constraint values
        //---------------------------------------------------------------
        console.log("Setting Constraints");
        data.forEach(p => 
        {
            var value = this.valueAccess(p);
            if (!isNumber(value))
                return;
            var x = Math.round((this.xAccess(p) - this.origin.x) / this.cellSize);
            var y = Math.round((this.yAccess(p) - this.origin.y) / this.cellSize);
            var idx = this.index(x, y);

            if (flagField.values[idx] == 0)
            {
                this.values[idx] = value;
                flagField.values[idx] = 1;
            }
            else if (INIT_AVG)
            {
                // averaging
                this.values[idx] += value;
                flagField.values[idx] += 1;
            }
            else
            {
                // max value
                this.values[idx] = Math.max(this.values[idx], value);
                flagField.values[idx] = 1;
            }
        })

        if (INIT_AVG)
        {
            for (var k = 0; k < this.values.length; k++)
            {
                var sum = this.values[k];
                var count = flagField.values[k];
                if (sum != null && count > 0)
                    this.values[k] /= count;
            }
        }

            
        // dilate constraint values
        //---------------------------------------------------------------
        console.log("Dilate Constraints");
        
        var dilatedField = new Field (this.width, this.height);
        
        for (var dIters = 0; dIters < dilationIters; dIters++)
        {
            dilatedField.values = this.values.slice(0);

            for (var x = 0; x < this.width; x++)
            for (var y = 0; y < this.height; y++)
            {
                if (INIT_AVG)   //--- FOR AVERAGING
                {
                    if (flagField.get(x, y) == 0)
                    {
                        const w0 = 0.25, w1 = 0.125, w2 = 0.0625;
                        var w = 0;
                        var sum = 0;
                        var a;

                        a = this.get(x-1,y-1); if(a != null) { sum += a*w2; w += w2; } 
                        a = this.get(x,  y-1); if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x+1,y-1); if(a != null) { sum += a*w2; w += w2; }
                        a = this.get(x-1, y);  if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x, y);    if(a != null) { sum += a*w0; w += w0; }
                        a = this.get(x+1, y);  if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x-1,y+1); if(a != null) { sum += a*w2; w += w2; }
                        a = this.get(x, y+1);  if(a != null) { sum += a*w1; w += w1; }
                        a = this.get(x+1,y+1); if(a != null) { sum += a*w2; w += w2; }
                        if (w > 0)
                        {
                            dilatedField.set(x, y, sum / w);
                            flagField.set(x, y, 1);
                        }
                    }
                }
                else   //--- FOR AVERAGING
                {
                    var a_self = this.get(x, y); 
                
                    const w0 = 0.25, w1 = 0.125, w2 = 0.0625;
                    var w = 0;
                    var sum = 0;
                    var a;

                    a = this.get(x-1,y-1); if(a > a_self) { sum += a*w2; w += w2; } 
                    a = this.get(x,  y-1); if(a > a_self) { sum += a*w1; w += w1; }
                    a = this.get(x+1,y-1); if(a > a_self) { sum += a*w2; w += w2; }
                    a = this.get(x-1, y);  if(a > a_self) { sum += a*w1; w += w1; }
                    a = this.get(x, y);    if(a > a_self) { sum += a*w0; w += w0; }
                    a = this.get(x+1, y);  if(a > a_self) { sum += a*w1; w += w1; }
                    a = this.get(x-1,y+1); if(a > a_self) { sum += a*w2; w += w2; }
                    a = this.get(x, y+1);  if(a > a_self) { sum += a*w1; w += w1; }
                    a = this.get(x+1,y+1); if(a > a_self) { sum += a*w2; w += w2; }
                    if (w > 0)
                    {
                        dilatedField.set(x, y, sum / w);
                        flagField.set(x, y, 1);
                    }
                }

            }
            this.values = dilatedField.values.slice(0); // copy thickened data back to current field   // TODO: SLICING NECESSARY????
        }

        // after setting hard constraints, diffuse
        this.diffuse(flagField, interpolationType)
        console.log("+++ Finished Diffusion");
    }


    diffuse(sourceField, interpolationType)
    {
        // Downsample
        //---------------------------------------------------------------
        console.log("Downsampling");
        var currentField = this;
        var currentFlags = sourceField;     // marks hard constraints (heat sources) by 1, others 0
        var pyramid = [];

        while (Math.max(currentField.width, currentField.height) > 1)
        { 
            var coarseField = new Field(Math.ceil(currentField.width / 2), Math.ceil(currentField.height / 2), 0);
            var coarseFlags = new Field(Math.ceil(currentField.width / 2), Math.ceil(currentField.height / 2), 0);
            for (var x = 0; x < coarseField.width; x++)
            for (var y = 0; y < coarseField.height; y++)
            {
                var subc = [[2*x, 2*y],[2*x+1,2*y],[2*x,2*y+1],[2*x+1,2*y+1]];
                var avg = 0, c = 0;
                var max = 0;
                var min = 1e20;

                var arr = [];
                for (var i = 0; i < 4; i++)
                    if (currentFlags.get(subc[i][0], subc[i][1])) {
                        var cell_value = currentField.get(subc[i][0], subc[i][1]);
                        min = Math.min(min, cell_value);
                        max = Math.max(max, cell_value);
                        avg += cell_value; c++;
                        arr.push(cell_value);
                    }
                if (c > 0)
                {
                    var value = max;
                    switch (interpolationType)
                    {
                    case InterpolationType.MIN: value = min; break;
                    case InterpolationType.MAX: value = max; break;
                    case InterpolationType.AVG: value = avg/c; break;
                    }
                    coarseField.set(x, y, value);
                    coarseFlags.set(x, y, 1);
                }
            }

            // push current inmage onto pyramid
            pyramid.push([currentField, currentFlags]);
            currentField = coarseField;
            currentFlags = coarseFlags;
        }

        
        // Upsample
        //---------------------------------------------------------------
        console.log("Upsampling");
        while (pyramid.length > 0)
        {
            var tuple = pyramid.pop();
            currentField = tuple[0];
            currentFlags = tuple[1];

            // fill holes using coarse field info
            for (var x = 0; x < currentField.width; x++) 
            for (var y = 0; y < currentField.height; y++)
            {
                // if (!currentFlags.get(x,y))   // HardConstraint all nonzero Flag Values
                if (currentFlags.get(x,y) != 1)   // Only HardConstraint Flag Values 1 - others can be sources, but are overwritten when upsampled
                    currentField.set(x, y, coarseField.get(Math.trunc(x/2), Math.trunc(y/2)));
            }

            // smooth unconstrained pixels of current field
            var smoothedField = new Field (currentField.width, currentField.height, 0);
            for (var x = 0; x < currentField.width; x++) 
            for (var y = 0; y < currentField.height; y++) 
            {
                
                const w0 = 0.25, w1 = 0.125, w2 = 0.0625;
                var w = 0;
                var sum = 0;
                var a;

                a = currentField.get(x-1,y-1); if(a != null) { sum += a*w2; w += w2; } 
                a = currentField.get(x,  y-1); if(a != null) { sum += a*w1; w += w1; }
                a = currentField.get(x+1,y-1); if(a != null) { sum += a*w2; w += w2; }
                a = currentField.get(x-1, y);  if(a != null) { sum += a*w1; w += w1; }
                a = currentField.get(x, y);    if(a != null) { sum += a*w0; w += w0; }
                a = currentField.get(x+1, y);  if(a != null) { sum += a*w1; w += w1; }
                a = currentField.get(x-1,y+1); if(a != null) { sum += a*w2; w += w2; }
                a = currentField.get(x, y+1);  if(a != null) { sum += a*w1; w += w1; }
                a = currentField.get(x+1,y+1); if(a != null) { sum += a*w2; w += w2; }
                smoothedField.set(x, y, sum / w);
            }
            currentField.values = smoothedField.values.slice(0); // copy smoothed data back to current field
            coarseField = currentField;
        }
    }


    getContourPaths(thresholds)
    {
        // create contours
        return d3.contours()
            .size([this.width, this.height])
            .thresholds(thresholds)
            (this.values)
    }
}



///////////////////////////////////////////////////////////////////////////////
// class GradientField
// defining a gradient field over a 2D scalar field, where the direction is 
// encoded in the (normalized) xy-coordinates

class GradientField extends Field
{
    constructor(scalarField)
    {
        super(scalarField.width, scalarField.height, new vec(0,0,0));
        
        for (var y = 1; y < this.height - 1; y++)
            for (var x = 1; x < this.width - 1; x++)
            {
                var ddx = scalarField.get(x+1, y) - scalarField.get(x-1, y);
                var ddy = scalarField.get(x, y+1) - scalarField.get(x, y-1);
                var grad = new vec(ddx/2, ddy/2);

                this.set(x, y, grad);
            }

        // extrapolate boundaries
        if (this.height > 1)
            for (var x = 0; x < this.width; x++)
            {
                this.set(x, 0, this.get(x, 1));
                this.set(x, this.height-1, this.get(x, this.height-2));
            }
        if (this.width > 1) 
            for (var y = 0; y < this.height; y++)
            {
                this.set(0, y, this.get(1, y));
                this.set(this.width-1, y, this.get(this.width-2, y));
            }
    }


    // sampling with bilinear interpolation
    sampleBilinear(x, y) 
    {
        // map
        // get enclosing values
        var x0 = Math.floor(x);
        var y0 = Math.floor(y);
        var x1 = x0 + 1;
        var y1 = y0 + 1;
        var tx = x - x0;
        var ty = y - y0;
        
        var v00 = this.get(x0, y0);
        var v10 = this.get(x1, y0);
        var v01 = this.get(x0, y1);
        var v11 = this.get(x1, y1);

        if (!v00 || !v10 || !v01 || !v11)
            return null;

        var v0 = v00.mul(1 - tx).add( v10.mul(tx) ); 
        var v1 = v01.mul(1 - tx).add( v11.mul(tx) ); 
        var value = v0.mul(1 - ty).add( v1.mul(ty) );

        if (isNaN(value.x) || isNaN(value.y))
            value = this.get(Math.round(x), Math.round(y));

        return value;
    }
}




///////////////////////////////////////////////////////////////////////////////
// class NormalField
// defining a field of normals over a 2D scalar field, where the field is embedded
// in the xy-plane, with scalar values extending to the z. direction. 
// The resulting normals will thus point in upwards in positive z-direction.

class NormalField extends Field
{
    constructor(scalarField, rangeToUnitFactor)
    {
        super(scalarField.width, scalarField.height, new vec(0,0,0));
        
        for (var y = 1; y < this.height - 1; y++)
            for (var x = 1; x < this.width - 1; x++)
            {
                var ddx = scalarField.get(x+1, y) - scalarField.get(x-1, y);
                var ddy = scalarField.get(x, y+1) - scalarField.get(x, y-1);
                var ds = 2 * scalarField.cellSize;

                var tx = new vec(ds, 0, ddx * rangeToUnitFactor)
                var ty = new vec(0, ds, ddy * rangeToUnitFactor)

                var n = tx.cross(ty).normalize();
                this.set(x, y, n);
            }

        // extrapolate boundaries
        if (this.height > 1)
            for (var x = 0; x < this.width; x++)
            {
                this.set(x, 0, this.get(x, 1));
                this.set(x, this.height-1, this.get(x, this.height-2));
            }
        if (this.width > 1) 
            for (var y = 0; y < this.height; y++)
            {
                this.set(0, y, this.get(1, y));
                this.set(this.width-1, y, this.get(this.width-2, y));
            }
    }

    // lightdir: ivnerse vector of traveling direction of parallel light rays
    getShadingContourPaths(lightdir)
    {
        // encodes the shadowing of the field (higher is darker)
        var shadowField = new Field(this.width, this.height, 0);
        for (var k = 0; k < this.values.length; k++)
        {
            var N = this.values[k];
            var lambert = Math.max(0, N.dot(lightdir));
            shadowField.values[k] = 1 - lambert;            // we want contours at where shadow is, not where light iss
        }

        // create contours
        return d3.contours()
            .size([this.width, this.height])
            .thresholds(d3.range(0, 1, 0.05))
            (shadowField.values)
    }
}
