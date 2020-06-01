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
// class vec

class vec
{
    constructor(x=0, y=0, z=0)
    {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static copy(other)
    {
        var x = other.x ? other.x : 0;
        var y = other.y ? other.y : 0;
        var z = other.z ? other.z : 0;
        return new vec(x,y,z);
    }

    norm() { 
        return Math.sqrt( this.x*this.x + this.y*this.y + this.z*this.z );
    }
    normalize() 
    {
        var il = 1.0 / this.norm();
        return new vec(this.x * il, this.y * il, this.z * il);
    }
    zero()
    {
        return this.x == 0 && this.y == 0 && this.z == 0;
    }
            
    cross(v) { 
        return new vec(this.y*v.z - this.z*v.y, this.z*v.x - this.x*v.z, this.x*v.y - this.y*v.x); 
    }
    dot(v) { 
        return this.x*v.x + this.y*v.y + this.z*v.z; 
    }
    
    // invert orientation
    negate() { return new vec(-this.x, -this.y, -this.z); }
    add(v)   { return new vec(this.x + v.x, this.y + v.y, this.z + v.z ); }
    sub(v)   { return new vec(this.x - v.x, this.y - v.y, this.z - v.z ); }
    div(s)   { return new vec(this.x/s, this.y/s, this.z/s); }
    mul(s)   { return new vec(this.x*s, this.y*s, this.z*s); }
}

///////////////////////////////////////////////////////////////////////////////
// other functions

function distance(a, b){
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}


function isNumber(val)
{
    return typeof val == "number";
}

function jiggle(epsilon = 1e-6)
{
    return (epsilon * (Math.random() - 0.5)) || epsilon;
}


function darken(col) 
{
    col = d3.hsl(col);
    col.l -= 0.1;
    col = d3.rgb(col.toString());
    col.r *= 0.9;
    col.g *= 0.9;
    col.b *= 0.9;
    return col.toString();
}

function brighten(col, factor) 
{
    col = d3.hsl(col);
	col = d3.rgb(col.toString());
    col.r *= 1+factor;
    col.g *= 1+factor;
    col.b *= 1+factor;
    return col.toString();
}