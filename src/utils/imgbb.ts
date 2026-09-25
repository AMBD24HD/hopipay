/**
 * Utility to upload an image to ImgBB via the ImgBB API v1
 * https://api.imgbb.com/1/upload
 */
/**
 * Utility to compress and upload images to ImgBB or fallback to safe, compact data URL
 */

// Helper to compress images client-side before upload or data URL storage
export function compressImage(file: File, maxDim = 512, quality = 0.85): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ blob: file, dataUrl: e.target?.result as string });
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first, fallback to jpeg
        const dataUrl = canvas.toDataURL('image/webp', quality) || canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve({ blob: file, dataUrl });
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('ছবি লোড করা যায়নি'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('ছবি রিড করতে ব্যর্থ হয়েছে'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToImgBB(file: File): Promise<string> {
  // Use provided environment key, or admin saved key in localStorage, or fallback demo key
  let apiKey = import.meta.env.VITE_IMGBB_API_KEY || '2d9215ef23267d3536fa189c4708ff39';
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('velopay_settings') || localStorage.getItem('hopi_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.imgbbApiKey && parsed.imgbbApiKey.trim()) {
          apiKey = parsed.imgbbApiKey.trim();
        }
      }
    } catch (e) {}
  }

  // Basic validation: max 20MB
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('ছবির সাইজ ২০ মেগাবাইটের বেশি হতে পারবে না');
  }

  // 1. First compress the image to max 512x512 so it is lightweight, lightning-fast & safe for Firestore
  let compressedDataUrl = '';
  let uploadBlob: Blob = file;

  try {
    const compressed = await compressImage(file, 512, 0.85);
    uploadBlob = compressed.blob;
    compressedDataUrl = compressed.dataUrl;
  } catch (compErr) {
    console.warn('Compression note:', compErr);
  }

  // 2. Attempt ImgBB API upload with compressed blob
  const formData = new FormData();
  formData.append('image', uploadBlob);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data.display_url || data.data.url;
      }
    }
  } catch (err: any) {
    console.warn('ImgBB API note, using safe compact data URL fallback:', err);
  }

  // 3. Fallback: Return the compressed, lightweight dataUrl (~20KB-40KB)
  // This will never exceed Firestore 1MB document limit or localStorage quota!
  if (compressedDataUrl) {
    return compressedDataUrl;
  }

  // Final fallback
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

