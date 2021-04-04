""" converts a GEDCOM file into a JSON file for use in Topographic Attribute Maps 
(https://github.com/rpreiner/tam)

this is just a proof of concept and might contain serious mistakes and problems
"""
import argparse
import json
import re

__author__ = "Florian Straub"

def add_child(parentId, childId, idsWithNodes, nodesWithFamily, res):
    if parentId != "" and childId in idsWithNodes:
        nodesWithFamily.append(parentId)
        link = {"source" : parentId, "target" : childId, "directed": True}
        res["links"].append(link)
        estimate_year(parentId, childId, res)
        if childId not in nodesWithFamily:  
            nodesWithFamily.append(childId)

def estimate_year(parentId, childId, res):
    childNode = next(x for x in res["nodes"] if x['id'] == child)
    parentNode = next((x for x in res["nodes"] if x['id'] == husb), None)
    if parentNode is not None and 'value' not in parentNode:
        estimatedBirth = childNode['value'] - 20
        print("estimated birth for " + parentNode['id'] + " (" + parentNode['name'] + "): " + str(estimatedBirth))
        parentNode['value'] = estimatedBirth

    
parser = argparse.ArgumentParser(description='convert GEDCOM file to JSON file for use in Topographic Attribute Maps')
parser.add_argument('gedcom', type=str, help='path to GEDCOM file')
parser.add_argument('json', type=str, help='path to JSON file')
args = parser.parse_args()

nodesWithFamily = []
res = {}
res["nodes"] = []
res["links"] = []

with open(args.gedcom, encoding='utf8', errors='ignore') as f:
    lines = f.readlines()
    node = {}
    husb = ""
    wife = ""
    idsWithNodes = []
    for i in range(len(lines)):
        line = lines[i]
        if " INDI" in line:
            if "id" in node:
                #if "value" in node:
                res["nodes"].append(node)
                idsWithNodes.append(node["id"])
                #else:
                #print("skipping yearless " + node["id"] + ": " + node["name"])
            lineParts = line.split()
            node = {"id" : lineParts[1]}
        elif "1 NAME" in line:
            node["name"] = line[7:].strip().replace('/', '')
        elif "1 BIRT" in line and "2 DATE" in lines[i+1]:
            birthRow = lines[i+1]
            match = re.match(r'.*([1-3][0-9]{3})', birthRow)
            if match is not None:
                node["value"] = int(match.group(1))
        elif "1 HUSB " in line:
            husb = line[7:].strip()
            if husb not in idsWithNodes:
                husb = ""
        elif "1 WIFE " in line:
            wife = line[7:].strip()
            if wife not in idsWithNodes:
                wife = ""
        elif "1 CHIL " in line:
            child = line[7:].strip()
            add_child(husb, child, idsWithNodes, nodesWithFamily, res)
            add_child(wife, child, idsWithNodes, nodesWithFamily, res)
        elif "0 " in line and " FAM" in line:
            husb = ""
            wife = ""

nodesWithoutParents = []
for oneNode in res["nodes"]:
    if oneNode["id"] not in nodesWithFamily:
        nodesWithoutParents.append(oneNode)

for orphanNode in nodesWithoutParents:
    try:
        print ("removing orphan " + orphanNode["id"] + ": " + orphanNode["name"])
    except:
        print ("removing orphan " + orphanNode["id"] + " which cannot be displayed properly")
    res["nodes"].remove(orphanNode)

with open(args.json, 'w', encoding="utf8") as outfile:
    json.dump(res, outfile, indent=3)


