const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSampleImages() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });

  try {
    console.log('Connected to database...');

    // Sample image URLs (using placeholder images)
    const packageImages = [
      {
        id: 'e22455b2-0897-11f1-90b6-00410e2b5e6e',
        name: 'Basic Electrical Lab Equipment',
        images: [
          'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500',
          'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500',
        ],
      },
      {
        id: 'e224704d-0897-11f1-90b6-00410e2b5e6e',
        name: 'Power Systems Equipment',
        images: ['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=500'],
      },
      {
        id: 'e224719d-0897-11f1-90b6-00410e2b5e6e',
        name: 'Electrical Machines Lab',
        images: [
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500',
          'https://images.unsplash.com/photo-1581092583537-20d51876f9e7?w=500',
        ],
      },
      {
        id: 'e224ac10-0897-11f1-90b6-00410e2b5e6e',
        name: 'Analog Electronics Kit',
        images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=500'],
      },
      {
        id: 'e224ba7f-0897-11f1-90b6-00410e2b5e6e',
        name: 'Digital Electronics Lab',
        images: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500'],
      },
      {
        id: 'e224bb41-0897-11f1-90b6-00410e2b5e6e',
        name: 'Communication Systems Equipment',
        images: ['https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=500'],
      },
      {
        id: 'e2250311-0897-11f1-90b6-00410e2b5e6e',
        name: 'Computer Hardware Lab',
        images: [
          'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=500',
          'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500',
        ],
      },
      {
        id: 'e2250e6c-0897-11f1-90b6-00410e2b5e6e',
        name: 'Networking Lab Equipment',
        images: ['https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500'],
      },
      {
        id: 'e2250f1d-0897-11f1-90b6-00410e2b5e6e',
        name: 'Software Development Tools',
        images: ['https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=500'],
      },
      {
        id: 'e2255202-0897-11f1-90b6-00410e2b5e6e',
        name: 'Workshop Machines',
        images: [
          'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=500',
          'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500',
        ],
      },
    ];

    console.log('Adding sample images to packages...\n');

    for (const pkg of packageImages) {
      const imagesJson = JSON.stringify(pkg.images);
      await connection.query(
        'UPDATE refurbishment_packages SET images = ?, updated_at = NOW() WHERE id = ?',
        [imagesJson, pkg.id]
      );
      console.log(`✅ ${pkg.name}: Added ${pkg.images.length} image(s)`);
    }

    console.log('\n✅ Successfully added sample images to 10 packages!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\nDatabase connection closed.');
  }
}

addSampleImages()
  .then(() => {
    console.log('\n✅ All done! Sample images added to packages.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
