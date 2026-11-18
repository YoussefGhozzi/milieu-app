import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Choisit une photo dans la galerie (ou un fichier sur le web), la recadre en carré
 * et la réduit à 320 px pour qu'elle tienne dans le stockage de démo.
 * Retourne une image « data: » ou null si l'utilisateur annule.
 */
export async function pickProfilePhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
  if (res.canceled || !res.assets?.[0]) return null;
  const ctx = ImageManipulator.manipulate(res.assets[0].uri).resize({ width: 320 });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : saved.uri;
}
