""" converts a GEDCOM file into a JSON file for use in Topographic Attribute Maps 
(https://github.com/rpreiner/tam)

this is just a proof of concept and might contain serious mistakes and problems
"""
import argparse
import json
import re

__author__ = "Florian Straub"

parser = argparse.ArgumentParser(description='convert GEDCOM file to JSON file for use in Topographic Attribute Maps')
parser.add_argument('gedcom', type=str, help='path to GEDCOM file')
parser.add_argument('json', type=str, help='path to JSON file')
args = parser.parse_args()

nodesWithFamily = []
res = {}
res["nodes"] = []
res["links"] = []

with open(args.gedcom, encoding='utf8') as f:
    lines = f.readlines()
    node = {}
    husb = ""
    wife = ""
    for i in range(len(lines)):
        line = lines[i]
        if " INDI" in line:
            if "id" in node:
                if "value" in node:
                    res["nodes"].append(node)
                else:
                    print("skipping yearless " + node["id"] + ": " + node["name"])
            lineParts = line.split()
            node = {"id" : lineParts[1]}
        elif "1 NAME" in line:
            node["name"] = line[7:].strip().replace('/', '')
        elif "1 BIRT" in line and "2 DATE" in lines[i+1]:
            birthRow = lines[i+1]
            match = re.match(r'.*([1-3][0-9]{3})', birthRow)
            if match is not None:
                node["value"] =  match.group(1)
        elif "1 HUSB " in line:
            husb = line[7:].strip()
        elif "1 WIFE " in line:
            wife = line[7:].strip()
        elif "1 CHIL " in line:
            nodesWithFamily.append(husb)
            nodesWithFamily.append(wife)
            link = {"source" : husb, "target" : line[7:].strip() , "directed": True}
            res["links"].append(link)
            link = {"source" : wife, "target" : line[7:].strip(), "directed": True}
            res["links"].append(link)

nodesWithoutParents = []
for oneNode in res["nodes"]:
    if oneNode["id"] not in nodesWithFamily:
        nodesWithoutParents.append(oneNode)
    else:
        print("has family " + oneNode["id"] + ": " + oneNode["name"])
        

for orphanNode in nodesWithoutParents:
    print ("removing orphan " + orphanNode["id"] + ": " + orphanNode["name"])
    res["nodes"].remove(orphanNode)

with open(args.json, 'w', encoding="utf8") as outfile:
    json.dump(res, outfile, indent=3)