from PIL import Image
img = Image.open('/home/z/my-project/upload/pasted_image_1783568430748.png')
print(f"Size: {img.size}")
print(f"Mode: {img.mode}")
# Save a smaller version for viewing
img.thumbnail((1280, 720))
img.save('/home/z/my-project/upload/pasted_image_small.png')
print("Saved smaller version")
