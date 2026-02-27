const db = require('../src/database/connection');

/**
 * Add placeholder images to packages without images
 * Uses Unsplash placeholder images for various technical lab equipment
 */

const placeholderImages = [
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500', // Computer/Tech
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500', // Electronics
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500', // Lab Equipment
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500', // Engineering
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500', // Circuit
  'https://images.unsplash.com/photo-1581092583537-20d51876f9e7?w=500', // Machinery
  'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=500', // Robotics
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500', // Technology
  'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=500', // Power Systems
  'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=500', // Workshop
];

const getRelevantImages = (packageName) => {
  const name = packageName.toLowerCase();
  
  // Match relevant images based on package name
  if (name.includes('concrete') || name.includes('soil') || name.includes('survey')) {
    return [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500',
      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500',
    ];
  }
  
  if (name.includes('furniture') || name.includes('fixture')) {
    return [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
    ];
  }
  
  if (name.includes('automation') || name.includes('plc') || name.includes('robot')) {
    return [
      'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=500',
      'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=500',
    ];
  }
  
  if (name.includes('measurement') || name.includes('metrology')) {
    return [
      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500',
    ];
  }
  
  if (name.includes('thermal') || name.includes('workshop')) {
    return [
      'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=500',
      'https://images.unsplash.com/photo-1581092583537-20d51876f9e7?w=500',
    ];
  }
  
  if (name.includes('safety')) {
    return [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500',
      'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500',
    ];
  }
  
  // Default images for any other package
  return [
    placeholderImages[Math.floor(Math.random() * placeholderImages.length)],
    placeholderImages[Math.floor(Math.random() * placeholderImages.length)],
  ];
};

(async () => {
  try {
    console.log('🔍 Checking packages without images...\n');
    
    // Get all packages
    const [packages] = await db.query(
      'SELECT id, package_name, images FROM refurbishment_packages ORDER BY package_name'
    );
    
    let updatedCount = 0;
    
    for (const pkg of packages) {
      if (!pkg.images || pkg.images === 'null' || pkg.images === '[]') {
        const relevantImages = getRelevantImages(pkg.package_name);
        const imagesJson = JSON.stringify(relevantImages);
        
        await db.query(
          'UPDATE refurbishment_packages SET images = ?, updated_at = NOW() WHERE id = ?',
          [imagesJson, pkg.id]
        );
        
        console.log(`✅ ${pkg.package_name}`);
        console.log(`   Added ${relevantImages.length} images`);
        relevantImages.forEach((img, idx) => {
          console.log(`   ${idx + 1}. ${img}`);
        });
        console.log('');
        
        updatedCount++;
      } else {
        const imageCount = JSON.parse(pkg.images).length;
        console.log(`⏭️  ${pkg.package_name} (already has ${imageCount} image${imageCount !== 1 ? 's' : ''})`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully updated ${updatedCount} package(s) with images`);
    console.log(`⏭️  Skipped ${packages.length - updatedCount} package(s) that already had images`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
