#!/usr/bin/env python3
"""Generate an original, stylized Daniela chibi with a bone rig and glTF animations.
Run: blender --background --python scripts/character/generate_daniela.py -- --output public/assets/characters/daniela-rigged.glb
This is deterministic geometry, not text-to-3D or Mixamo scraping. No paid APIs.
"""
import argparse
import json
import math
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument("--output", default="public/assets/characters/daniela-rigged.glb")
parser.add_argument("--blend-output", default="build/character/daniela-source.blend")
parser.add_argument("--preview-output", default=None, help="Optional PNG render for side-by-side aesthetic review")
parser.add_argument("--variant", choices=("legacy", "original-inspired"), default="legacy", help="Keep legacy output unchanged unless explicitly requested")
args = parser.parse_args(argv)
os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
os.makedirs(os.path.dirname(os.path.abspath(args.blend_output)), exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)
scene = bpy.context.scene
scene.render.fps = 30

def material(name, color, roughness=.7):
    m = bpy.data.materials.new(name)
    m.diffuse_color = tuple(color) + (1,)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = tuple(color) + (1,)
    bsdf.inputs["Roughness"].default_value = roughness
    return m

skin = material("Peach porcelain skin", (.99, .80, .72))
hair = material("Deep lavender purple hair", (.32, .19, .41))
hairshine = material("Plum hair highlights", (.45, .27, .55))
eyes = material("Glossy purple eyes", (.19, .12, .29), .24)
white = material("Soft pearly white", (.98, .96, .99), .35)
dress = material("Strawberry pink dress", (.96, .48, .69))
trim = material("Lavender costume trim", (.76, .63, .94))
blush = material("Peach blush", (.99, .56, .67))
gold = material("Gold charms", (.99, .77, .39), .30)
shoe = material("Cute white shoes", (.97, .91, .96), .45)
tongue = material("Candy smile", (.78, .34, .51))
rootmat = material("Socks", (.91, .83, .96))
mesh_parts = []

# Visual experiment only: match the palette and face proportions of the Babylon
# original. The existing legacy export stays the default for production.
original_inspired = args.variant == "original-inspired"
if original_inspired:
    skin.diffuse_color = (1.0, .89, .80, 1)
    hair.diffuse_color = (.408, .290, .475, 1)
    hairshine.diffuse_color = (.49, .35, .56, 1)
    eyes.diffuse_color = (.275, .188, .353, 1)
    dress.diffuse_color = (.957, .612, .796, 1)
    trim.diffuse_color = (1.0, .969, .933, 1)
    for mat, color in ((skin,(1.,.89,.80)), (hair,(.408,.290,.475)), (hairshine,(.49,.35,.56)), (eyes,(.275,.188,.353)), (dress,(.957,.612,.796)), (trim,(1.,.969,.933))):
        mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*color, 1.)

# Local Blender axes: +Y is the front of the character. glTF export converts to -Z front.
def sphere(label, position, radius, mat, bone, segments=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=10, location=position)
    obj = bpy.context.object
    obj.name = label
    obj.scale = radius
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(mat)
    group = obj.vertex_groups.new(name=bone)
    group.add([v.index for v in obj.data.vertices], 1.0, "REPLACE")
    for poly in obj.data.polygons:
        poly.use_smooth = True
    mesh_parts.append(obj)
    return obj

def orb(label, pos, dimensions, mat, bone):
    return sphere(label, pos, dimensions, mat, bone)

# Character body dimensions: around 3.55 Blender units including bow.
orb("Daniela body", (0, 0, 1.33), (.65, .53, .80), dress, "Torso")
orb("Satin shirt collar", (0, .46, 1.77), (.37, .15, .18), white, "Torso")
orb("Bell skirt", (0, -.02, .90), (.76, .62, .56), dress, "Torso")
for sign, label in [(-1, "L"), (1, "R")]:
    orb(label + " skirt ruffle", (sign * .43, .37, .75), (.30, .22, .13), trim, "Torso")
    orb(label + " tiny dress star", (sign * .39, .60, 1.0), (.085, .065, .085), gold, "Torso")
    orb(label + " long socks", (sign * .32, .055, .45), (.21, .19, .37), rootmat, label + "Leg")
    orb(label + " sneakers", (sign * .33, .20, .17), (.25, .39, .18), shoe, label + "Leg")
    orb(label + " legs", (sign * .32, 0, .57), (.18, .19, .39), skin, label + "Leg")
    orb(label + " puff sleeves", (sign * .76, .0, 1.77), (.31, .32, .32), trim, label + "Arm")
    orb(label + " forearm", (sign * .89, .04, 1.31), (.22, .20, .43), skin, label + "Arm")
    orb(label + " hand", (sign * .94, .09, 1.06), (.22, .22, .23), skin, label + "Arm")

# Oversized and unmistakably cute face.
orb("Round face", (0, .01, 2.61), (.91, .73, .89) if original_inspired else (.85, .74, .87), skin, "Head")
orb("Purple hair cap", (0, -.07, 2.93), (.94, .80, .75), hair, "Head")
orb("Side-swept fringe", (-.06, .53, 3.20), (.87, .36, .29), hairshine, "Head")
for i, x in enumerate((-.63, -.35, -.03, .29, .58)):
    orb("Curly bangs %s" % i, (x, .65, 3.02 + math.sin(i*1.8)*.085),
        (.25, .20, .25), hair if i%2 else hairshine, "Head")
for sign, label in [(-1, "L"), (1, "R")]:
    orb(label + " cheek blush", (sign*.56, .663, 2.36), (.25, .075, .115), blush, "Head")
    orb(label + " eye", (sign*.34, .743, 2.57), (.225, .09, .275) if original_inspired else (.188, .085, .23), eyes, "Head")
    orb(label + " iris glint", (sign*.34-.065, .823, 2.66), (.082, .044, .097) if original_inspired else (.072, .044, .087), white, "Head")
    orb(label + " eye little glint", (sign*.34+.052, .828, 2.49), (.04, .035, .044), white, "Head")
    orb(label + " eyebrow", (sign*.34, .70, 2.87), (.17, .095, .035), hair, "Head")
    orb(label + " ponytail", (sign*1.06, -.14, 2.53), (.39, .48, .62), hair, label + "Hair")
    orb(label + " ponytail curl", (sign*1.12, .15, 2.22), (.26, .24, .29), hairshine, label + "Hair")
    orb(label + " hair tie", (sign*.90, .07, 2.96), (.19, .18, .19), dress, "Head")

orb("Nose", (0, .79, 2.45), (.055, .05, .065), blush, "Head")
orb("Mouth", (0, .77, 2.29), (.115, .06, .052) if original_inspired else (.125, .06, .068), tongue, "Head")
orb("Hairbow left loop", (.49, .13, 3.60), (.31, .19, .18), dress, "Head")
orb("Hairbow right loop", (.91, .13, 3.60), (.30, .20, .18), dress, "Head")
orb("Hairbow jewel", (.70, .30, 3.60), (.12, .11, .12), gold, "Head")
orb("Hairbow little ribbon", (.61, .11, 3.40), (.11, .14, .21), trim, "Head")
orb("Collar charm", (0, .555, 1.52), (.11, .10, .12), gold, "Torso")

# Edit an armature explicitly instead of trusting Blender's automatic weights.
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
rig = bpy.context.object
rig.name = "DanielaRig"
rig.data.name = "DanielaArmature"
rig.show_in_front = False
rig.data.edit_bones.remove(rig.data.edit_bones[0])

def bone(name, head, tail, parent=None):
    b = rig.data.edit_bones.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = rig.data.edit_bones[parent]
        b.use_connect = False
    return b

bone("Root", (0, 0, .01), (0, 0, .78))
bone("Torso", (0, 0, .83), (0, 0, 2.03), "Root")
bone("Head", (0, 0, 2.10), (0, 0, 2.85), "Torso")
bone("LArm", (-.70, 0, 1.80), (-.99, 0, 1.05), "Torso")
bone("RArm", (.70, 0, 1.80), (.99, 0, 1.05), "Torso")
bone("LLeg", (-.32, 0, .84), (-.32, 0, .16), "Root")
bone("RLeg", (.32, 0, .84), (.32, 0, .16), "Root")
bone("LHair", (-.92, -.09, 2.92), (-1.10, -.15, 2.15), "Head")
bone("RHair", (.92, -.09, 2.92), (1.10, -.15, 2.15), "Head")
bpy.ops.object.mode_set(mode="OBJECT")

# Join individual primitives into ONE mesh with material slots and named vertex groups.
bpy.ops.object.select_all(action="DESELECT")
for obj in mesh_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = mesh_parts[0]
bpy.ops.object.join()
character = bpy.context.object
character.name = "DanielaSkinnedMesh"
bpy.ops.object.select_all(action="DESELECT")
character.parent = rig
mod = character.modifiers.new("Daniela bone skin", "ARMATURE")
mod.object = rig
mod.use_deform_preserve_volume = True
rig.animation_data_create()

def reset_pose():
    for p in rig.pose.bones:
        p.rotation_mode = "XYZ"
        p.rotation_euler = (0,0,0)
        p.location = (0,0,0)

def pose(style, fraction):
    reset_pose()
    p = rig.pose.bones
    omega = fraction * math.tau
    beat = math.sin(omega)
    step = math.sin(omega * 2)
    p["Root"].location.z = .025 * beat
    p["Head"].rotation_euler.y = .065 * beat
    p["LHair"].rotation_euler.y = -.13*beat
    p["RHair"].rotation_euler.y = .12*beat
    if style == "Idle":
        p["Torso"].rotation_euler.y = .032 * beat
        p["LArm"].rotation_euler.y = -.08 + .035 * beat
        p["RArm"].rotation_euler.y = .08 - .035 * beat
    elif style == "Wave":
        p["RArm"].rotation_euler.y = -1.9
        p["RArm"].rotation_euler.x = .35 * step
        p["Head"].rotation_euler.x = -.09
    elif style in ("Giggle", "Laugh"):
        strength = .13 if style=="Giggle" else .24
        p["Root"].location.z = strength*abs(step)
        p["Torso"].rotation_euler.y = .11 * beat
        p["Head"].rotation_euler.x = -.09 + strength * step
        p["LArm"].rotation_euler.y = -.8 + .18 * step
        p["RArm"].rotation_euler.y = .8 - .18 * step
    elif style in ("DancePop","DanceCute","DanceHipHop","DanceDisco"):
        speed = 2 if style in ("DancePop","DanceHipHop") else 1
        rhythm = math.sin(omega*speed)
        p["Root"].location.z = (.12 if style!="DanceCute" else .07)*abs(rhythm)
        p["Root"].location.x = .13 * beat
        p["Torso"].rotation_euler.y = .19*rhythm
        p["Torso"].rotation_euler.x = .13 * beat
        p["LLeg"].rotation_euler.y = .24 * rhythm
        p["RLeg"].rotation_euler.y = -.24 * rhythm
        p["Head"].rotation_euler.y = -.12 * rhythm
        if style == "DancePop":
            p["LArm"].rotation_euler.y = -1.35 + .55*rhythm
            p["RArm"].rotation_euler.y = 1.35 - .55*rhythm
        elif style == "DanceCute":
            p["LArm"].rotation_euler.y = -1.5 + .25*rhythm
            p["RArm"].rotation_euler.y = 1.5 + .25*rhythm
            p["Head"].rotation_euler.x = -.15
        elif style == "DanceHipHop":
            p["LArm"].rotation_euler.y = -.45 + 1.0*rhythm
            p["RArm"].rotation_euler.y = .4 + 1.0*math.cos(omega*speed)
            p["Torso"].rotation_euler.x = .24*rhythm
        else:
            p["LArm"].rotation_euler.y = -1.95 + .16*rhythm
            p["RArm"].rotation_euler.y = 1.95 - .16*rhythm
            p["Torso"].rotation_euler.z = .20*beat
    elif style == "Sing":
        p["RArm"].rotation_euler.y = -1.64 + .06 * step
        p["LArm"].rotation_euler.y = -.39 + .30 * beat
        p["Head"].rotation_euler.x = -.18 + .14*step
        p["Torso"].rotation_euler.y = .06 * beat
    elif style in ("Eat", "Drink"):
        reaching = max(0,min(1,(fraction-.10)/.25)) * (1-max(0,min(1,(fraction-.75)/.20)))
        p["RArm"].rotation_euler.y = -2.15*reaching
        p["RArm"].rotation_euler.x = -.36*reaching
        p["Head"].rotation_euler.x = (-.09 if style=="Drink" else .065)*reaching + .04*step
    elif style == "Volley":
        hit = max(0,min(1,(fraction-.25)/.2))*(1-max(0,min(1,(fraction-.7)/.2)))
        p["Root"].location.z = .29 * hit
        p["LArm"].rotation_euler.y = -1.9 * hit
        p["RArm"].rotation_euler.y = 1.9 * hit
        p["Torso"].rotation_euler.x = -.14 * hit
    elif style == "Sleep":
        p["Torso"].rotation_euler.x = .11
        p["Head"].rotation_euler.x = .22 + .04*beat
        p["LArm"].rotation_euler.y = -.20
        p["RArm"].rotation_euler.y = .20
    elif style == "Bath":
        p["LArm"].rotation_euler.y = -.35 + .45*beat
        p["RArm"].rotation_euler.y = .35 + .45*step
        p["Head"].rotation_euler.y = .08*step
    elif style == "Jump":
        p["Root"].location.z = .43*max(0,beat)
        p["LArm"].rotation_euler.y = -1.7
        p["RArm"].rotation_euler.y = 1.7
    elif style == "Celebrate":
        p["Root"].location.z = .15*abs(step)
        p["LArm"].rotation_euler.y = -2.15 + .17*step
        p["RArm"].rotation_euler.y = 2.15 - .17*step
        p["Head"].rotation_euler.x = -.15
    return p

names = [
    ("Idle",48), ("Wave",48), ("Giggle",36), ("Laugh",36),
    ("DancePop",60), ("DanceCute",60), ("DanceHipHop",60), ("DanceDisco",60),
    ("Sing",60), ("Eat",60), ("Drink",60), ("Volley",42),
    ("Sleep",48), ("Bath",48), ("Jump",36), ("Celebrate",48)
]

for name, end in names:
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    # Stable first and last frame, so looping dance/idle clips never snap.
    frames = sorted(set([1,end] + list(range(1,end+1,6))))
    for frame in frames:
        t = (frame-1)/(end-1)
        bones = pose(name,t)
        for b in bones:
            b.keyframe_insert(data_path="rotation_euler",frame=frame,group=b.name)
            b.keyframe_insert(data_path="location",frame=frame,group=b.name)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 1, action)
    strip.action_frame_start = 1
    strip.action_frame_end = end
    track.lock = True

rig.animation_data.action = None
reset_pose()
scene.frame_set(1)
scene.frame_end = 60

# Save native .blend for future improvements; publish the GLB for Babylon.js.
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.blend_output))
export_properties = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
kwargs = {
    "filepath": os.path.abspath(args.output),
    "export_format": "GLB",
    "export_animations": True,
    "export_skins": True,
    "export_nla_strips": True,
    "export_force_sampling": True,
    "export_cameras": False,
    "export_lights": False,
    "export_yup": True
}
if "export_animation_mode" in export_properties:
    kwargs["export_animation_mode"] = "NLA_TRACKS"
bpy.ops.export_scene.gltf(**kwargs)
assert os.path.getsize(args.output) > 4000, "GLB unexpectedly small"
# A lightweight review render: cameras and lights are added *after* GLB export.
# This PNG is not part of the playable character or production deployment.
if args.preview_output:
    os.makedirs(os.path.dirname(os.path.abspath(args.preview_output)), exist_ok=True)
    from mathutils import Vector
    bpy.ops.object.camera_add(location=(5.2, 8.8, 4.15))
    camera = bpy.context.object
    direction = Vector((0, 0, 1.92)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 4.6
    scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(-3, 5, 7))
    bpy.context.object.data.energy = 650
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 5
    bpy.ops.object.light_add(type="AREA", location=(3, 2, 5))
    bpy.context.object.data.energy = 350
    bpy.context.object.data.size = 4
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.abspath(args.preview_output)
    scene.camera.data.lens = 42
    bpy.ops.render.render(write_still=True)
    print("DANIELA PREVIEW:", args.preview_output)

print("DANIELA VARIANT:", args.variant)
print("DANIELA GENERATED:",args.output,"bytes",os.path.getsize(args.output))
print("DANIELA CLIPS:",", ".join(n for n,_ in names))
