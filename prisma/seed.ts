import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const hash = async (p: string) => bcrypt.hash(p, 10)

  // Communities
  const communities = await Promise.all([
    prisma.community.upsert({
      where: { slug: 'crypto' },
      update: {},
      create: {
        name: 'عملات رقمية',
        slug: 'crypto',
        description: 'نقاشات وتحليلات البيتكوين، الإيثيريوم وجميع العملات الرقمية',
        category: 'CRYPTO',
        memberCount: 1240,
        postCount: 380,
      },
    }),
    prisma.community.upsert({
      where: { slug: 'stocks' },
      update: {},
      create: {
        name: 'أسهم السوق السعودي',
        slug: 'stocks',
        description: 'تحليلات وأخبار سوق الأسهم السعودي والخليجي',
        category: 'STOCKS',
        memberCount: 890,
        postCount: 210,
      },
    }),
    prisma.community.upsert({
      where: { slug: 'real-estate' },
      update: {},
      create: {
        name: 'عقارات',
        slug: 'real-estate',
        description: 'فرص الاستثمار العقاري، أسعار السوق، والنصائح العقارية',
        category: 'REAL_ESTATE',
        memberCount: 420,
        postCount: 95,
      },
    }),
    prisma.community.upsert({
      where: { slug: 'startups' },
      update: {},
      create: {
        name: 'المشاريع الناشئة',
        slug: 'startups',
        description: 'نقاشات الاستثمار في الشركات الناشئة وريادة الأعمال',
        category: 'STARTUPS',
        memberCount: 310,
        postCount: 78,
      },
    }),
    prisma.community.upsert({
      where: { slug: 'forex' },
      update: {},
      create: {
        name: 'فوركس وعملات',
        slug: 'forex',
        description: 'تداول العملات الأجنبية وأزواج الفوركس',
        category: 'FOREX',
        memberCount: 560,
        postCount: 145,
      },
    }),
  ])

  // Users
  const analyst = await prisma.user.upsert({
    where: { email: 'ahmed@zawed.io' },
    update: {},
    create: {
      email: 'ahmed@zawed.io',
      username: 'ahmed_analyst',
      name: 'أحمد الشمري',
      passwordHash: await hash('password123'),
      role: 'VERIFIED_ANALYST',
      bio: 'محلل مالي متخصص في العملات الرقمية والأسهم السعودية. خبرة 8 سنوات في أسواق المال.',
      reputationScore: 87.5,
      predictionAccuracy: 73.2,
      totalPredictions: 45,
      correctPredictions: 33,
      isVerified: true,
    },
  })

  const trader = await prisma.user.upsert({
    where: { email: 'sara@zawed.io' },
    update: {},
    create: {
      email: 'sara@zawed.io',
      username: 'sara_trades',
      name: 'سارة العتيبي',
      passwordHash: await hash('password123'),
      role: 'ANALYST',
      bio: 'متداولة يومية في الفوركس والعملات الرقمية. أشارك تحليلاتي اليومية هنا.',
      reputationScore: 62.0,
      predictionAccuracy: 61.5,
      totalPredictions: 26,
      correctPredictions: 16,
      isVerified: false,
    },
  })

  const newbie = await prisma.user.upsert({
    where: { email: 'demo@zawed.io' },
    update: {},
    create: {
      email: 'demo@zawed.io',
      username: 'demo_user',
      name: 'مستخدم تجريبي',
      passwordHash: await hash('demo1234'),
      role: 'USER',
    },
  })

  // Sample posts
  await prisma.post.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'post-btc-1',
        authorId: analyst.id,
        communityId: communities[0]!.id,
        type: 'ANALYSIS',
        category: 'CRYPTO',
        title: 'تحليل البيتكوين أسبوعي — هل اكتمل التصحيح؟',
        content:
          'بعد فترة تصحيح امتدت 3 أسابيع، يبدو البيتكوين على وشك إكمال نمط المثلث المتماثل على الإطار الزمني الأسبوعي.\n\nالمستويات الرئيسية:\n• دعم قوي عند $90,000\n• مقاومة أولى عند $98,500\n• المستهدف في حال الاختراق: $115,000\n\nالـ RSI يظهر تشبع بيعي على الإطار اليومي مع تباعد إيجابي مع السعر، مما يعزز احتمالية الارتداد.',
        ticker: 'BTC',
        upvotes: 47,
        downvotes: 3,
        commentCount: 12,
      },
      {
        id: 'post-eth-1',
        authorId: analyst.id,
        communityId: communities[0]!.id,
        type: 'PREDICTION',
        category: 'CRYPTO',
        title: 'توقع: إيثيريوم سيتجاوز $4,000 قبل نهاية الشهر',
        content:
          'توقعي الصريح: ETH ستتجاوز $4,000 خلال 3 أسابيع.\n\nالأسباب:\n١. الاختراق فوق نمط الكوب والعروة\n٢. الزخم الإيجابي في معدل رسوم الشبكة\n٣. تدفقات ETF إيجابية هذا الأسبوع',
        ticker: 'ETH',
        predictionDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        upvotes: 31,
        downvotes: 8,
        commentCount: 7,
      },
      {
        id: 'post-tadawul-1',
        authorId: trader.id,
        communityId: communities[1]!.id,
        type: 'ANALYSIS',
        category: 'STOCKS',
        title: 'تحليل مؤشر تداول — نقاط الدعم الأسبوعية',
        content:
          'المؤشر السعودي يترقب كسر مستوى 12,800 نقطة ليفتح الطريق نحو 13,200.\n\nالتحليل القطاعي:\n• قطاع البنوك: إيجابي\n• قطاع الطاقة: محايد\n• قطاع التقنية: سلبي على المدى القصير\n\nالدعم الرئيسي: 12,400 نقطة',
        ticker: 'TASI',
        upvotes: 22,
        downvotes: 2,
        commentCount: 5,
      },
      {
        id: 'post-gold-1',
        authorId: trader.id,
        type: 'NEWS',
        category: 'COMMODITIES',
        title: 'الذهب يلامس مستويات قياسية جديدة',
        content:
          'وصل الذهب اليوم إلى $2,450 للأوقية، مسجلاً مستوى قياسياً جديداً في ظل تراجع الدولار الأمريكي وتوقعات خفض أسعار الفائدة.',
        ticker: 'GOLD',
        upvotes: 18,
        downvotes: 1,
        commentCount: 3,
      },
      {
        id: 'post-eurusd-1',
        authorId: analyst.id,
        communityId: communities[4]!.id,
        type: 'ANALYSIS',
        category: 'FOREX',
        title: 'EUR/USD: السيناريوهات المحتملة هذا الأسبوع',
        content:
          'الزوج EUR/USD يتداول عند 1.0850 مع ترقب إعلانات البنك المركزي الأوروبي.\n\nصعودي: كسر 1.0900 يفتح الطريق إلى 1.1000\nهبوطي: الانكسار دون 1.0780 يستهدف 1.0650',
        ticker: 'EUR/USD',
        upvotes: 14,
        downvotes: 0,
        commentCount: 2,
      },
    ],
  })

  // Rooms
  await prisma.room.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'room-crypto-live',
        name: 'غرفة تداول البيتكوين — مباشر',
        description: 'نقاش حي لتحركات البيتكوين والعملات الرقمية',
        topic: 'تحليل التحركات اليومية لـ BTC و ETH',
        category: 'CRYPTO',
        isLive: true,
        participantCount: 34,
      },
      {
        id: 'room-tasi',
        name: 'غرفة السوق السعودي',
        description: 'متابعة إغلاق السوق اليومي وأبرز الأسهم',
        topic: 'جلسة اليوم: أسهم البنوك',
        category: 'STOCKS',
        isLive: true,
        participantCount: 21,
      },
      {
        id: 'room-weekly',
        name: 'النقاش الأسبوعي للمستثمرين',
        description: 'جلسة أسبوعية شاملة لمراجعة الأسواق العالمية',
        topic: 'مراجعة أسبوع: الأسواق الناشئة',
        category: 'GENERAL',
        isLive: false,
        participantCount: 12,
      },
    ],
  })

  // Sample messages
  await prisma.roomMessage.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'msg-1',
        roomId: 'room-crypto-live',
        authorId: analyst.id,
        content: 'الدعم عند 90k ثابت حتى الآن، نترقب ارتداد',
      },
      {
        id: 'msg-2',
        roomId: 'room-crypto-live',
        authorId: trader.id,
        content: 'الحجم منخفض = لا نثق بالحركة الحالية',
      },
      {
        id: 'msg-3',
        roomId: 'room-crypto-live',
        authorId: newbie.id,
        content: 'هل هذا وقت جيد للدخول؟',
      },
      {
        id: 'msg-4',
        roomId: 'room-tasi',
        authorId: analyst.id,
        content: 'بنك الراجحي يبدو متماسك فوق 85، مراقبة الاختراق',
      },
    ],
  })

  // Memberships
  await prisma.communityMember.createMany({
    skipDuplicates: true,
    data: [
      { userId: analyst.id, communityId: communities[0]!.id },
      { userId: analyst.id, communityId: communities[1]!.id },
      { userId: analyst.id, communityId: communities[4]!.id },
      { userId: trader.id, communityId: communities[0]!.id },
      { userId: trader.id, communityId: communities[4]!.id },
      { userId: newbie.id, communityId: communities[0]!.id },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('👤 Demo accounts:')
  console.log('   ahmed@zawed.io / password123 (Verified Analyst - rep: 87)')
  console.log('   sara@zawed.io / password123 (Analyst - rep: 62)')
  console.log('   demo@zawed.io / demo1234 (User)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
