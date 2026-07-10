import prisma from '../config/db.js';

/**
 * Converts a string into a URL-friendly slug.
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
};

/**
 * Generates a unique slug by checking the database.
 */
export const generateUniqueSlug = async (baseTitle: string): Promise<string> => {
  // Strip file extension if present
  const cleanTitle = baseTitle.replace(/\.[^/.]+$/, '');
  const baseSlug = slugify(cleanTitle) || 'flipbook';
  
  let slug = baseSlug;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const existing = await prisma.flipbook.findUnique({
      where: { slug },
    });

    if (!existing) {
      isUnique = true;
    } else {
      // Append a random 4-character suffix on collision
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${baseSlug}-${suffix}`;
      attempts++;
    }
  }

  // Fallback if all attempts fail (rare)
  if (!isUnique) {
    slug = `${baseSlug}-${Date.now()}`;
  }

  return slug;
};
