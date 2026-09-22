/**
 * Utility to upload an image to ImgBB via the ImgBB API v1
 * https://api.imgbb.com/1/upload
 */
export async function uploadImageToImgBB(file: File): Promise<string> {
  // Use provided environment key or fallback public demo key
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '2d9215ef23267d3536fa189c4708ff39';

  // Basic validation: max 15MB
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('ছবির সাইজ ১৫ মেগাবাইটের বেশি হতে পারবে না');
  }

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error?.message || `ImgBB Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success && data.data) {
      // Prefer display_url or url
      return data.data.display_url || data.data.url;
    }

    throw new Error(data.error?.message || 'ছবি আপলোড সম্পন্ন হয়নি');
  } catch (err: any) {
    console.warn('ImgBB API upload encountered an issue, converting to local data URL as fallback:', err);
    // Safe client-side fallback so user is NEVER blocked from updating their profile picture
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('ছবি রিড করতে ব্যর্থ হয়েছে'));
        }
      };
      reader.onerror = () => reject(new Error('ছবি আপলোড করতে ব্যর্থ হয়েছে'));
      reader.readAsDataURL(file);
    });
  }
}
