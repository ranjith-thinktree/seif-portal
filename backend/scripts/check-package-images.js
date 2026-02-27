const db = require('../src/database/connection');

(async () => {
  try {
    const [packages] = await db.query('SELECT id, package_name, images FROM refurbishment_packages ORDER BY package_name');
    
    console.log('=== PACKAGES WITH IMAGES ===');
    console.log('Total packages:', packages.length);
    console.log('');
    
    packages.forEach(pkg => {
      const images = pkg.images ? JSON.parse(pkg.images) : [];
      console.log(`ID: ${pkg.id}`);
      console.log(`Name: ${pkg.package_name}`);
      console.log(`Images: ${images.length} image(s)`);
      if (images.length > 0) {
        images.forEach((img, i) => console.log(`  [${i+1}] ${img}`));
      }
      console.log('---');
    });
    
    const withImages = packages.filter(p => p.images && JSON.parse(p.images).length > 0).length;
    const without = packages.length - withImages;
    console.log(`\nSummary: ${withImages} with images, ${without} without images`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
