import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sampleSources = [
  {
    website: 'FDA News',
    topic: 'Regulatory',
    link: 'https://www.fda.gov/news-events',
    comment: 'US FDA regulatory updates and drug approvals',
    geoScope: 'United States',
    importanceLevel: 'High',
    requiresScreening: false,
    active: true
  },
  {
    website: 'EMA',
    topic: 'Regulatory',
    link: 'https://www.ema.europa.eu/en/news',
    comment: 'European Medicines Agency updates',
    geoScope: 'Europe',
    importanceLevel: 'High',
    requiresScreening: false,
    active: true
  },
  {
    website: 'NICE',
    topic: 'HTA',
    link: 'https://www.nice.org.uk/news',
    comment: 'UK National Institute for Health and Care Excellence',
    geoScope: 'United Kingdom',
    importanceLevel: 'High',
    requiresScreening: false,
    active: true
  },
  {
    website: 'ICER',
    topic: 'HTA',
    link: 'https://icer.org/news-insights/',
    comment: 'Institute for Clinical and Economic Review',
    geoScope: 'United States',
    importanceLevel: 'Medium',
    requiresScreening: false,
    active: true
  },
  {
    website: 'PharmaTimes',
    topic: 'Market Access',
    link: 'https://www.pharmatimes.com/news/market_access',
    comment: 'Market access and pricing news',
    geoScope: 'Global',
    importanceLevel: 'Medium',
    requiresScreening: true,
    active: true
  },
  {
    website: 'FiercePharma',
    topic: 'Industry News',
    link: 'https://www.fiercepharma.com/',
    comment: 'Pharmaceutical industry news and analysis',
    geoScope: 'Global',
    importanceLevel: 'Medium',
    requiresScreening: true,
    active: true
  },
  {
    website: 'CADTH',
    topic: 'HTA',
    link: 'https://www.cadth.ca/news',
    comment: 'Canadian Agency for Drugs and Technologies in Health',
    geoScope: 'Canada',
    importanceLevel: 'Medium',
    requiresScreening: false,
    active: true
  },
  {
    website: 'HAS',
    topic: 'HTA',
    link: 'https://www.has-sante.fr/jcms/fc_2875171/en/news',
    comment: 'French National Authority for Health',
    geoScope: 'France',
    importanceLevel: 'High',
    requiresScreening: false,
    active: true
  },
  {
    website: 'ISPOR',
    topic: 'HEOR',
    link: 'https://www.ispor.org/heor-resources/news',
    comment: 'International Society for Pharmacoeconomics and Outcomes Research',
    geoScope: 'Global',
    importanceLevel: 'High',
    requiresScreening: false,
    active: true
  },
  {
    website: 'ClinicalTrials.gov',
    topic: 'Clinical Trials',
    link: 'https://clinicaltrials.gov/',
    comment: 'US clinical trials database',
    geoScope: 'United States',
    importanceLevel: 'Medium',
    requiresScreening: true,
    active: true
  }
]

async function seedDatabase() {
  try {
    console.log('Seeding database with sample news sources...')

    for (const source of sampleSources) {
      await prisma.newsSource.upsert({
        where: {
          website_topic: {
            website: source.website,
            topic: source.topic
          }
        },
        update: source,
        create: source
      })
      console.log(`✓ Added: ${source.website} (${source.topic})`)
    }

    const count = await prisma.newsSource.count()
    console.log(`\n✅ Database seeded successfully! Total sources: ${count}`)

  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase()