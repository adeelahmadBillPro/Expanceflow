const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Food & Dining', icon: '🍔', color: '#EF4444' },
  { name: 'Groceries', icon: '🛒', color: '#F97316' },
  { name: 'Transportation', icon: '🚗', color: '#F59E0B' },
  { name: 'Fuel', icon: '⛽', color: '#EAB308' },
  { name: 'Shopping', icon: '🛍️', color: '#84CC16' },
  { name: 'Entertainment', icon: '🎬', color: '#22C55E' },
  { name: 'Health & Medical', icon: '🏥', color: '#10B981' },
  { name: 'Education', icon: '📚', color: '#14B8A6' },
  { name: 'Rent', icon: '🏠', color: '#06B6D4' },
  { name: 'Utilities', icon: '💡', color: '#0EA5E9' },
  { name: 'Internet & Phone', icon: '📱', color: '#3B82F6' },
  { name: 'Insurance', icon: '🛡️', color: '#6366F1' },
  { name: 'Clothing', icon: '👕', color: '#8B5CF6' },
  { name: 'Personal Care', icon: '💇', color: '#A855F7' },
  { name: 'Gifts & Donations', icon: '🎁', color: '#D946EF' },
  { name: 'Travel', icon: '✈️', color: '#EC4899' },
  { name: 'Subscriptions', icon: '📺', color: '#F43F5E' },
  { name: 'Maintenance', icon: '🔧', color: '#78716C' },
  { name: 'Taxes', icon: '📋', color: '#64748B' },
  { name: 'Savings', icon: '💰', color: '#059669' },
  { name: 'Other', icon: '📌', color: '#6B7280' },
  { name: 'Salary', icon: '💵', color: '#16A34A', type: 'INCOME' },
  { name: 'Freelance', icon: '💻', color: '#2563EB', type: 'INCOME' },
  { name: 'Business Income', icon: '🏢', color: '#7C3AED', type: 'INCOME' },
];

async function main() {
  console.log('Seeding default categories...');

  // Delete existing defaults first to avoid duplicates
  await prisma.category.deleteMany({ where: { isDefault: true } });

  await prisma.category.createMany({
    data: defaultCategories.map((cat) => ({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
      type: cat.type || 'EXPENSE',
      orgId: null,
    })),
  });

  console.log(`Seeded ${defaultCategories.length} default categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
