///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
///////////////////////////////////////////////////////////////////////////////

const MALE = 1;
const FEMALE = 2;


class Person
{
    constructor(id, givenname, surname, bdate, motherId, fatherId)
    {
        this.id = id;
        this.sex = FEMALE;
        this.givenname = givenname;
        this.surname = surname;
        this.bdate = bdate;
        this.bplace = null;
        this.ddate = null;
        
        this.families = [];     // list of families this person belongs to
    }

    getFullName()
    {
        if (this.givenname || this.surname)
            return this.givenname + " " + this.surname;
        return null;
    }

    getMother()
    {
        for (var f of this.families)
            if (f.children.includes(this))
                return f.wife;
        return null;
    }

    getFather()
    {
        for (var f of this.families)
            if (f.children.includes(this))
            return f.husband;
        return null;
    }

    getChildren()
    {
        var ch = [];
        for (var f of this.families)
            if (this == f.husband || this == f.wife)
                ch = ch.concat(f.children);
        return ch;
    }

    getSpouses()
    {
        var sp = [];
        for (var f of this.families)
            if (this == f.husband && f.wife)
                sp = sp.concat(f.wife);
            else if (this == f.wife && f.husband)
                sp = sp.concat(f.husband);
        return sp;
    }
}


function loadGedcom(url, callback)
{
    var gedcom = {
        "persons" : new Map(),
        "families" : new Map()
    };

    var graph = this;

    d3.text(url).then(function(text) 
    { 
        var lines = text.split("\n");

        var current_pers = null;
        var current_fam = null;
        var current_parentType = null;

        for (var i = 0; i < lines.length; i++)
        {
            var tokens = lines[i].split(" ");
            if (tokens[0] == "0" && tokens.length > 2)
			{
                var nodeType = tokens[2].trim();
                if (nodeType == "INDI")
                {
                    var id = tokens[1].toString();
                    current_pers = new Person(id, null, null, null, 0, 0);
                    gedcom.persons.set(id, current_pers);
                }
                else if (nodeType == "FAM")
                {
                    var id = tokens[1];
                    current_fam = {
                        husband : null,
                        wife : null,
                        children : []
                    };
                    gedcom.families.set(id, current_fam);
                }
                else
                {
                    current_pers = null;
                    current_fam = null;
                }
            }
            //-------------------------------------------------------------
            else if (tokens[0] == 1)
            {
                var nodeType = tokens[1].trim();
                current_parentType = nodeType;
                
                //-------------------------- encounterd while parsing PERSONS
                var nodeType = tokens[1].trim();
                if (current_parentType == "NAME" && current_pers && current_pers.getFullName() == null)
                {
                    for (var j = 2; j < tokens.length; j++)
                    {
                        if (current_pers.surname == null && tokens[j].startsWith("/"))      // extract surname
                            current_pers.surname = tokens[j].replace(/\//g, " ").trim();
                        else if (current_pers.givenname == null)                            // given name
                            current_pers.givenname = tokens[j].trim();
                    }
                }
                else if (nodeType == "SEX" && current_pers)
                {
                    var sex = tokens[2].trim();
                    current_pers.sex = sex == "M" ? MALE : FEMALE;
                }
                //-------------------------- encounterd while parsing FAMILIES
                else if (nodeType == "HUSB")
                {
                    // important to trim trailing \r from id token!!
                    var person = gedcom.persons.get(tokens[2].trim());
                    if (person) {
                        // create bidirectional link between family and person
                        person.families.push(current_fam);
                        current_fam.husband = person;
                    }
                }
                else if (nodeType == "WIFE")
                {
                    var person = gedcom.persons.get(tokens[2].trim());
                    if (person) {
                        // create bidirectional link between family and person
                        person.families.push(current_fam);
                        current_fam.wife = person;
                    }
                }
                else if (nodeType == "CHIL")
                {
                    var id = tokens[2].trim()
                    if (!gedcom.persons.get(id))
                        gedcom.persons.set(id, new Person(id, null, null, null, 0, 0));
                    var person = gedcom.persons.get(id);
                    
                    // create bidirectional link between family and person
                    person.families.push(current_fam);
                    current_fam.children.push(person);
                }
            }
            //-------------------------------------------------------------
            else if (tokens[0] == 2)
            {
                if (tokens[1] == "DATE" && tokens.length > 2)
                {
                    var date = null;
                    var datestr = tokens.slice(2).join(" ");

                    var cleanstr = datestr
                        .toLowerCase()
                        // unwanted characters and words
                        .replace(/\./g, ' ').replace("?"," ").replace(","," ")
                        .replace("abt"," ").replace("before").replace("bef"," ")
                        .replace("undefined "," ").replace("undef "," ")
                        .replace("um "," ")
                        // common german wording replacements
                        .replace("jänner","jan").replace("januar ","jan ")
                        .replace("feber","feb").replace("februar ","feb ")
                        .replace("märz","mar").replace("mai","may")
                        .replace("juni","jun").replace("juli","jul")
                        .replace("okt","oct").replace("dez","dec")
                        .replace("ä","a")
                        .trim();                        
                   
                    // add day number in case only month and year is given
                    if (cleanstr.split(" ").filter(function(v,i,a){ return v != ""; }).length == 2 
                        && /^[jfmasond]/.test(cleanstr))
                        cleanstr = "1 "+cleanstr;
                    
                    // convert to timestap in ms
                    var datems = Date.parse(cleanstr);
                    
                    if (!isFinite(datems))
                    {
                        // parsing error -> parse ourselves
                        var a = cleanstr.split(" ").filter(function(v,i,a){ return v != ""; });
                        if (a.length > 2)
                        {
                            var customstr = a[2].trim() + "-" + a[1].trim() + "-" + a[0].trim();
                            datems = Date.parse(customstr); 
                            if (isFinite(datems))
                                date = new Date(datems);
                            else
                                console.log("Can't parse custom date string '"+customstr+"' ("+cleanstr+")("+datestr+")");
                        }
                        else
                        {
                            console.log("Can't parse date string '"+datestr+"' ("+cleanstr+")");
                            date = null; // unknown date
                        }
                    }
                    else
                        date = new Date(datems);
                    
                    // set date to event
                    if (current_parentType == "BIRT") current_pers.bdate = date;
                    else if (current_parentType == "DEAT") current_pers.ddate = date;
				}
			}
		}
            
        console.log("Loaded " + gedcom.persons.size + " persons in " + gedcom.families.size + " families");
	    
        callback(gedcom);
    })
}

 
function estimateMissingDates(gedcom, procreationAge)
{
	var updated = true;
	while (updated)
	{
		// continue estimation until nothing was updated anymore
		updated = false;
		gedcom.persons.forEach( function(p){
			if (p.bdate == null)    // missing date of birth
			{
				var mother = p.getMother();
				var father = p.getFather();

				// birthday of youngest parent
				var pbdate = null;
				var mbdate = mother ? mother.bdate : null;
				var fbdate = father ? father.bdate : null;
				if (mbdate != null && fbdate == null) pbdate = mbdate;
				else if (mbdate == null && fbdate != null) pbdate = fbdate;
				else if (mbdate && fbdate) pbdate = (mbdate > fbdate) ? mbdate : fbdate;
				
				// birthday of oldest child
				var cbdate = null;
				var children = p.getChildren();
				for (var c of children)
					if (cbdate == null)
						cbdate = c.bdate;
					else if (c.bdate && c.bdate < cbdate)
						cbdate = c.bdate;

				// birthday of oldest spouse
				var spbdate = null;
				var spouses = p.getSpouses();
				for (var sp of spouses)
					if (spbdate == null)
						spbdate = sp.bdate;
					else if (sp.bdate && sp.bdate < spbdate)
						spbdate = sp.bdate;


				// estimate based on parent or child birthdates
				if (pbdate != null || cbdate != null)
				{
					if (pbdate != null && cbdate == null)  
					{
						p.bdate = new Date(pbdate.getTime());
						p.bdate.setFullYear(p.bdate.getFullYear() + procreationAge);
					}
					else if (pbdate == null && cbdate != null)  
					{
						p.bdate = new Date(cbdate.getTime());
						p.bdate.setFullYear(p.bdate.getFullYear() - procreationAge);
					}
					else if (pbdate != null && cbdate != null)
					{
						p.bdate = new Date((pbdate.getTime() + cbdate.getTime())/2);
					}
				
					console.log("Missing birth date of "+ p.getFullName() + " was estimated "+p.bdate);
					updated = true;
				}
				// neither parents nor childs are known - estimate based on spouse's bdate
				else if (spbdate != null)
				{
					p.bdate = new Date(spbdate.getTime());  // assume person is of the same age as his oldest spouse
					updated = true;
				}
			}
		});
	}

	// check who's left
	gedcom.persons.forEach( function(p){
		if (p.bdate == null)    // missing date of birth
		{
			console.log("Still missing birth date of "+ p.getFullName());
		}
	});
}

