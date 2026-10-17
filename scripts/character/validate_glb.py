#!/usr/bin/env python3
"""Validate a generated GLB without installing any Python packages.
CI fails if rig, mesh, animation tracks or required movements are missing.
Produces a manifest consumed by the standalone preview page.
"""
import argparse
import json
import os
import struct
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument("glb")
parser.add_argument("--manifest",default="public/assets/characters/daniela-manifest.json")
parser.add_argument("--minimum-clips",type=int,default=16)
args=parser.parse_args()
path=Path(args.glb)
data=path.read_bytes()
if len(data)<4096:
    raise SystemExit("GLB is missing or too small")
magic,version,total=struct.unpack_from("<4sII",data,0)
if magic!=b"glTF" or version!=2 or total!=len(data):
    raise SystemExit("Invalid glTF 2.0 binary header")
chunk_len,chunk_type=struct.unpack_from("<I4s",data,12)
if chunk_type!=b"JSON" or 20+chunk_len>len(data):
    raise SystemExit("No valid glTF JSON chunk")
doc=json.loads(data[20:20+chunk_len].decode("utf8"))
skins=doc.get("skins",[])
meshes=doc.get("meshes",[])
nodes=doc.get("nodes",[])
clips=doc.get("animations",[])
clip_names=[entry.get("name","") for entry in clips]
expected={"Idle","Wave","Giggle","Laugh","DancePop","DanceCute","DanceHipHop","DanceDisco",
          "Sing","Eat","Drink","Volley","Sleep","Bath","Jump","Celebrate"}
if not skins or not any(len(skin.get("joints",[]))>=7 for skin in skins):
    raise SystemExit("Missing skeleton with enough named joints")
if not meshes or not any(mesh.get("primitives") for mesh in meshes):
    raise SystemExit("Missing animated 3D character geometry")
if len(clips)<args.minimum_clips:
    raise SystemExit("Not enough animation clips: %r" % clip_names)
if not expected.issubset(set(clip_names)):
    raise SystemExit("Missing expected named clips: %s" % sorted(expected-set(clip_names)))
for clip in clips:
    if not clip.get("channels") or not clip.get("samplers"):
        raise SystemExit("Empty animation: %s" % clip.get("name"))
if not any(node.get("skin") is not None for node in nodes):
    raise SystemExit("Character meshes were not linked to their armature")
out={
    "generator":"Blender headless / GitHub Actions",
    "format":"glTF 2.0 (GLB)",
    "file":"daniela-rigged.glb",
    "size_bytes":len(data),
    "skin_count":len(skins),
    "joint_count":max(len(skin.get("joints",[])) for skin in skins),
    "mesh_count":len(meshes),
    "animation_count":len(clips),
    "animations":clip_names,
    "ready_for_preview":True,
    "note":"Experimental rigged character; existing in-game Daniela remains the default."
}
dest=Path(args.manifest)
dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("VALIDATED Daniela GLB:",len(data),"bytes /",len(meshes),"meshes /",len(skins),"skins")
print("ANIMATIONS:",", ".join(clip_names))
print("MANIFEST:",dest)
