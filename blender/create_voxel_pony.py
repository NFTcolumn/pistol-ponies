import bpy
import random

def clear_scene():
    """Removes all objects from the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def create_material(name, color):
    """Creates a new principled BSDF material with the given color."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color + (1.0,) # RGBA
    return mat

def add_voxel(loc, scale, mat):
    """Adds a cube at loc with the given scale and material."""
    bpy.ops.mesh.primitive_cube_add(location=loc, size=1)
    obj = bpy.context.active_object
    obj.scale = scale
    obj.active_material = mat
    return obj

def create_pony():
    # Colors (Approximate from the image)
    colors = {
        "green": (0.35, 0.75, 0.25),      # Skin
        "pink": (0.7, 0.1, 0.5),         # Hair/Tail
        "orange": (1.0, 0.4, 0.1),       # Shirt
        "brown": (0.3, 0.2, 0.1),        # Shorts/Boots
        "black": (0.02, 0.02, 0.02),      # Sunglasses
        "white": (0.9, 0.9, 0.9),        # Flower details
        "yellow": (0.9, 0.8, 0.1)        # Muzzle/Detail
    }

    mats = {name: create_material(name, color) for name, color in colors.items()}

    # Helper for adding boxes
    # Minecraft scale: 1 unit = 1 block. 
    # Humanoid: Legs 2x6x2, Torso 8x12x4, Head 8x8x8.
    # We'll adapt for a Pony character.

    # 1. LEGS (Bottom to top)
    # Left Leg
    add_voxel((-1.5, 0, 1), (1, 1, 2), mats["brown"]) # Boot/Short bottom
    add_voxel((-1.5, 0, 3.5), (1, 1, 3), mats["green"]) # Skin leg
    
    # Right Leg
    add_voxel((1.5, 0, 1), (1, 1, 2), mats["brown"]) 
    add_voxel((1.5, 0, 3.5), (1, 1, 3), mats["green"])

    # 2. TORSO (Shirt)
    torso_main = add_voxel((0, 0, 8), (4, 2, 6), mats["orange"])
    
    # Add shirt details (Flowers) - random small blocks
    for _ in range(12):
        lx = random.uniform(-1.8, 1.8)
        ly = random.choice([-1.05, 1.05])
        lz = random.uniform(5.5, 10.5)
        add_voxel((lx, ly, lz), (0.2, 0.1, 0.2), mats["white"])

    # 3. ARMS
    # Left Arm
    add_voxel((-2.5, 0, 8.5), (1, 1, 4), mats["green"])
    add_voxel((-2.5, 0, 10), (1.1, 1.1, 1.5), mats["orange"]) # Sleeve
    
    # Right Arm
    add_voxel((2.5, 0, 8.5), (1, 1, 4), mats["green"])
    add_voxel((2.5, 0, 10), (1.1, 1.1, 1.5), mats["orange"]) # Sleeve

    # 4. HEAD
    add_voxel((0, 0, 14), (4, 4, 4), mats["green"])
    
    # Muzzle (Snout)
    add_voxel((0, -2.5, 13), (1.5, 1, 1.2), mats["green"])
    
    # Ears
    add_voxel((-1.5, 0, 16.5), (0.5, 0.5, 1), mats["green"])
    add_voxel((1.5, 0, 16.5), (0.5, 0.5, 1), mats["green"])

    # 5. SUNGLASSES
    add_voxel((0, -2.1, 14.5), (4.2, 0.2, 1), mats["black"]) # Frame
    # Lenses detail (white shine)
    add_voxel((-1, -2.2, 14.5), (0.1, 0.1, 0.1), mats["white"])
    add_voxel((1, -2.2, 14.5), (0.1, 0.1, 0.1), mats["white"])

    # 6. HAIR (Mohawk - Voxelized)
    # Background Mohawk
    for i in range(10):
        z_pos = 14 + (i * 0.4)
        y_pos = 0 + (i * 0.2)
        add_voxel((0, y_pos, z_pos), (1, 2, 1), mats["pink"])
    
    # Random hair voxels for that messy look
    for _ in range(40):
        hx = random.uniform(-1.5, 1.5)
        hy = random.uniform(-1.5, 1.5)
        hz = random.uniform(15, 18)
        add_voxel((hx, hy, hz), (0.4, 0.4, 0.4), mats["pink"])

    # 7. TAIL
    for _ in range(15):
        tx = random.uniform(-0.5, 0.5)
        ty = random.uniform(2, 3.5)
        tz = random.uniform(5, 8)
        add_voxel((tx, ty, tz), (0.8, 0.8, 0.8), mats["pink"])

def main():
    clear_scene()
    create_pony()
    
    # Set view to look at character (Modern Blender 3.2+ way)
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for region in area.regions:
                if region.type == 'WINDOW':
                    with bpy.context.temp_override(area=area, region=region):
                        bpy.ops.view3d.view_all(center=False)
                    break

if __name__ == "__main__":
    main()
