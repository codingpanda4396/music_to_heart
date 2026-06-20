import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const moods = [
  ['anxiety', '焦虑', '我停不下来'],
  ['fatigue', '疲惫', '我不想再努力了'],
  ['loneliness', '孤独', '没人真正理解我'],
  ['nihilism', '虚无', '我不知道这一切有什么意义'],
  ['sadness', '悲伤', '我失去了一些东西'],
  ['out-of-control', '失控', '生活正在脱离我的掌控'],
  ['irritability', '烦躁', '我压着很多情绪'],
  ['chaos', '混乱', '我需要重新整理自己'],
  ['quiet', '安静', '我想从世界中退后一步'],
  ['strength', '力量', '我需要重新站起来'],
  ['restart', '重新开始', '我想重新进入生活'],
  ['sacred', '神圣', '我想靠近更高的东西'],
] as const;

const tracks = [
  {
    id: 'track-goldberg-aria',
    title: '《哥德堡变奏曲》咏叹调',
    composer: 'J. S. Bach',
    performer: 'Angela Hewitt',
    bilibiliBvid: 'BV1bf4y1q7mo',
    category: '西方古典',
    period: '巴洛克',
    durationText: '约 5 分钟',
    searchKeywords: '巴赫 哥德堡变奏曲 咏叹调',
    moods: ['anxiety', 'out-of-control', 'chaos', 'quiet'],
    guide: {
      intro: '先别急着听懂它。让开头那条朴素的旋律，在你面前慢慢铺开。',
      firstImpression:
        '它没有催促，也不靠强烈的情绪抓住你。每一个音都像被安放在恰当的位置，给混乱留出可以呼吸的边界。',
      background:
        '《哥德堡变奏曲》由这个咏叹调和三十个变奏构成。后来发生的丰富变化，并非装饰同一条旋律，而是始终站在同一组低音与和声根基上。',
      listeningPoints:
        '听旋律如何在停顿中保持连贯，也留意低声部怎样稳定地向前。你不必数清结构，只需感到它从未真正失去方向。',
      emotionalInterpretation:
        '焦虑常让人误以为必须立刻处理所有事情。这首音乐提供另一种经验：稳定不是控制一切，而是先找到一个仍可依靠的内部支点。',
      reflectionQuestion: '如果今天只能恢复一种秩序，你最想先恢复什么？',
      takeaway: '不必一次解决一切，先让一个音落在它该在的位置。',
    },
  },
  {
    id: 'track-schubert-serenade',
    title: '《小夜曲》',
    composer: 'Franz Schubert',
    performer: null,
    bilibiliBvid: 'BV1Wf4y1m7i4',
    category: '西方古典',
    period: '浪漫主义',
    durationText: '约 4 分钟',
    searchKeywords: '舒伯特 小夜曲 Ständchen',
    moods: ['loneliness', 'sadness', 'fatigue'],
    guide: {
      intro: '把它当成一句在夜里没有说完的话，而不是一首需要被辨认的名曲。',
      firstImpression:
        '旋律温柔，却始终带着一点距离。它靠近你，又不粗暴地揭开伤口；像有人知道你的孤独，但愿意坐在不远处。',
      background:
        '这首艺术歌曲写于舒伯特生命晚期，诗中的呼唤既是爱情，也是对回应的等待。今天常听到的器乐版本，仍保留了歌唱般的呼吸。',
      listeningPoints:
        '留意每个乐句末尾微微下沉的感觉，以及伴奏如何像夜色一样重复。不要追赶高潮，听那份克制的等待。',
      emotionalInterpretation:
        '孤独未必需要立刻被消除。有时，被一段音乐准确地陪伴，比被劝说振作更接近真正的安慰。',
      reflectionQuestion: '你最近在等待谁，或等待怎样的一句回应？',
      takeaway: '有些话尚未得到回答，也仍值得被温柔地说出。',
    },
  },
  {
    id: 'track-beethoven-seven-two',
    title: '第七交响曲第二乐章',
    composer: 'Ludwig van Beethoven',
    performer: 'Herbert von Karajan',
    bilibiliBvid: 'BV19W41127nq',
    category: '西方古典',
    period: '古典主义',
    durationText: '约 9 分钟',
    searchKeywords: '贝多芬 第七交响曲 第二乐章 Allegretto',
    moods: ['strength', 'restart', 'chaos', 'out-of-control', 'irritability'],
    guide: {
      intro: '这不是昂扬的胜利音乐。它更像人在沉重中重新学会迈步。',
      firstImpression:
        '一个短短的节奏不断返回，冷静、坚定，不夸耀力量。声部逐渐加入，像原本散乱的人群重新找到共同的步伐。',
      background:
        '第二乐章标记为 Allegretto。它以反复的节奏型建立全曲骨架，在明暗之间推进，是贝多芬最广为流传的慢乐章之一。',
      listeningPoints:
        '先跟住低声部的节奏，再听旋律如何一层层叠上去。力量不在音量，而在节奏每次回来时都没有放弃。',
      emotionalInterpretation:
        '重新开始不一定伴随热情。更常见的开始，是在仍然疲惫时做出下一个可完成的动作。',
      reflectionQuestion: '此刻哪一个最小的动作，能让你重新向前一步？',
      takeaway: '力量也可以很安静：只是继续走下一步。',
    },
  },
  {
    id: 'track-mahler-nine-four',
    title: '第九交响曲第四乐章',
    composer: 'Gustav Mahler',
    performer: 'Claudio Abbado',
    bilibiliBvid: 'BV1fA4y1U7un',
    category: '西方古典',
    period: '晚期浪漫主义',
    durationText: '约 24 分钟',
    searchKeywords: '马勒 第九交响曲 第四乐章 Adagio',
    moods: ['nihilism', 'sadness', 'loneliness', 'sacred'],
    guide: {
      intro: '如果你现在无法接受轻快的安慰，这个漫长的告别也许更诚实。',
      firstImpression:
        '弦乐缓慢展开，既有痛感，也有异常宽阔的宁静。音乐没有把失去解释掉，而是陪它走到声音几乎消失。',
      background:
        '马勒写作第九交响曲时已深知疾病与死亡的临近。末乐章常被理解为告别，但它并没有唯一的故事，也不要求听者接受宗教答案。',
      listeningPoints:
        '听强烈的弦乐段落如何一次次退回微弱的声音。最后几分钟尤其需要耐心，让停顿也成为音乐的一部分。',
      emotionalInterpretation:
        '虚无感有时来自所有答案都显得轻薄。这首音乐不急着回答，而是证明：即使面对消逝，人仍能保持深度与尊严。',
      reflectionQuestion: '如果不急着赋予意义，你愿意先认真告别什么？',
      takeaway: '消逝并不使曾经的感受变得虚假。',
    },
  },
  {
    id: 'track-faure-in-paradisum',
    title: '《安魂曲》In Paradisum',
    composer: 'Gabriel Fauré',
    performer: 'Ivor Bolton / 丹麦广播交响乐团',
    bilibiliBvid: 'BV1Jw411B7Ff',
    category: '圣乐',
    period: '浪漫主义',
    durationText: '约 4 分钟',
    searchKeywords: '福雷 安魂曲 In Paradisum',
    moods: ['fatigue', 'sadness', 'quiet', 'sacred'],
    guide: {
      intro: '这段音乐不描述审判，而像把疲惫的人轻轻送到可以休息的地方。',
      firstImpression:
        '高声部清澈，伴奏缓慢流动。它的明亮不是兴奋，而是一种没有压力的光，让人暂时不用证明自己。',
      background:
        '福雷的《安魂曲》避开许多传统安魂曲中恐惧而宏大的场面。终曲标题意为“进入乐园”，关注安息多于威慑。',
      listeningPoints:
        '留意合唱的长线条与竖琴般的流动感。听它如何保持轻盈，不把悲伤推向戏剧化的高潮。',
      emotionalInterpretation:
        '真正的休息不是奖赏，也不必等所有任务完成后才有资格获得。疲惫本身已经足以成为停下来的理由。',
      reflectionQuestion: '如果现在允许自己休息，你愿意暂时放下哪件事？',
      takeaway: '你不需要先完成一切，才配得到片刻安息。',
    },
  },
  {
    id: 'track-part-spiegel',
    title: 'Spiegel im Spiegel',
    composer: 'Arvo Pärt',
    performer: null,
    bilibiliBvid: 'BV1Yp411R7un',
    category: '极简音乐',
    period: '现代',
    durationText: '约 9 分钟',
    searchKeywords: 'Arvo Pärt Spiegel im Spiegel',
    moods: ['anxiety', 'quiet', 'sacred', 'nihilism', 'out-of-control'],
    guide: {
      intro: '把速度交给音乐。你只需要跟随一条缓慢的线，看它去往哪里。',
      firstImpression:
        '钢琴像钟声一样重复，独奏乐器在其上拉出悠长旋律。几乎没有冲突，却并不空洞，每一次呼吸都清晰可见。',
      background:
        '标题意为“镜中之镜”。作品采用帕特标志性的钟鸣风格，以极少材料形成仿佛向两侧无限延伸的对称感。',
      listeningPoints:
        '听钢琴三和弦的稳定重复，也听旋律怎样从中心向外行走再返回。不要等待事件发生，重复本身就是内容。',
      emotionalInterpretation:
        '当意识不断寻找刺激与答案，简单的重复能让注意力重新落回此刻。空白不再是缺失，而成为可以容纳自己的空间。',
      reflectionQuestion: '当外界安静下来，你最先听见自己内心的什么？',
      takeaway: '空白不是虚无，它也可以是一种容纳。',
    },
  },
  {
    id: 'track-eno-ascent',
    title: 'An Ending (Ascent)',
    composer: 'Brian Eno',
    performer: 'Brian Eno',
    bilibiliBvid: 'BV11HHDzdEH5',
    category: '环境音乐',
    period: '当代',
    durationText: '约 4 分钟',
    searchKeywords: 'Brian Eno An Ending Ascent',
    moods: ['fatigue', 'anxiety', 'quiet', 'chaos'],
    guide: {
      intro: '先不要把它当成一首歌。把它当成房间里逐渐改变的空气。',
      firstImpression:
        '和声像远处的云缓慢移动，没有明确节拍，也没有要求你跟随的旋律。声音出现、停留、消散，留下柔和的余白。',
      background:
        '这首作品来自环境音乐专辑《Apollo》。Eno希望环境音乐既能被注意，也能被忽略，让声音成为空间的一部分。',
      listeningPoints:
        '注意每个和弦的边缘如何模糊，以及声音消失后留下的安静。试着不预测下一次变化。',
      emotionalInterpretation:
        '疲惫时，连理解音乐也可能成为任务。这段声音允许注意力松开，不要求你得到结论或产生正确感受。',
      reflectionQuestion: '如果今天不必得出结论，你最想让什么悬而未决？',
      takeaway: '有些结束，不是关闭，而是慢慢松开。',
    },
  },
  {
    id: 'track-sakamoto-aqua',
    title: 'Aqua',
    composer: '坂本龙一',
    performer: '坂本龙一',
    bilibiliBvid: 'BV1Wj411H7hp',
    category: '当代器乐',
    period: '当代',
    durationText: '约 5 分钟',
    searchKeywords: '坂本龙一 Aqua 钢琴',
    moods: ['fatigue', 'loneliness', 'sadness', 'quiet'],
    guide: {
      intro: '它像水，不替你说话，只让那些已经很重的东西暂时浮起来。',
      firstImpression:
        '钢琴音色透明，旋律简洁而略带迟疑。许多情绪停在将要说清、却还没有说清的位置。',
      background:
        '坂本龙一的音乐常在电子、古典与日常声音之间移动。《Aqua》以很少的音符保留了宽阔的情绪空间。',
      listeningPoints:
        '听右手旋律里短暂的停顿，以及低音如何温和地改变颜色。允许余音完全消失，再迎接下一个音。',
      emotionalInterpretation:
        '悲伤不总需要激烈表达。它也可以像水一样改变形状，在不被逼迫的时间里慢慢流动。',
      reflectionQuestion: '最近哪一种感受，你一直没有找到合适的话说出来？',
      takeaway: '说不清也没有关系，感受仍然可以流动。',
    },
  },
  {
    id: 'track-hisaishi-summer',
    title: 'One Summer’s Day',
    composer: '久石让',
    performer: '久石让',
    bilibiliBvid: 'BV1vw4m1a7A9',
    category: '电影音乐',
    period: '当代',
    durationText: '约 4 分钟',
    searchKeywords: '久石让 One Summer’s Day 那个夏天',
    moods: ['restart', 'fatigue', 'loneliness', 'strength'],
    guide: {
      intro: '把它当作一道通往旧日的门。回忆不是退回过去，也可能帮助你重新出发。',
      firstImpression:
        '旋律先有些孤单，随后出现温暖而明亮的流动。它保留童年的好奇，也知道成长并不轻松。',
      background:
        '作品出自电影《千与千寻》。它没有复述剧情，而是抓住进入陌生世界时那种害怕、惊奇与不得不成长的感觉。',
      listeningPoints:
        '听开头简洁的钢琴主题如何被更多声部接住。注意音乐变得开阔时，原来的那点孤单并没有被抹去。',
      emotionalInterpretation:
        '重新开始不是变成另一个人，而是带着已经经历的一切，再次对世界保持一点好奇。',
      reflectionQuestion: '过去的你，曾经拥有哪一种现在仍值得找回的勇气？',
      takeaway: '成长不是告别自己，而是带着自己继续进入未知。',
    },
  },
  {
    id: 'track-guqin-liushui',
    title: '古琴《流水》',
    composer: '传统琴曲',
    performer: '杨青',
    bilibiliBvid: 'BV1Rb411m71Y',
    category: '中国传统音乐',
    period: null,
    durationText: '约 8 分钟',
    searchKeywords: '古琴 流水 名家 演奏',
    moods: ['irritability', 'chaos', 'strength', 'restart', 'out-of-control'],
    guide: {
      intro: '不要只寻找“山水意境”。先听一股力量怎样改变形态，却始终向前。',
      firstImpression:
        '声音有时稀疏如水滴，有时密集如急流。古琴的摩擦、余韵与空白，让流动显得既具体又遥远。',
      background:
        '《流水》源自古老的琴曲传统，后世形成多种谱本与演奏方式。“高山流水”的故事赋予它知音意象，但音乐本身远比故事更开放。',
      listeningPoints:
        '听滑音怎样连接不同音高，也听节奏从从容变为湍急。变化很大，但运动方向一直清楚。',
      emotionalInterpretation:
        '失控常使人想把一切固定下来。流水提醒我们，秩序也可以存在于变化中：不靠停止，而靠持续找到方向。',
      reflectionQuestion: '哪一件事无法被固定，却仍可以被你引导？',
      takeaway: '不必阻止变化，先在变化中辨认方向。',
    },
  },
  {
    id: 'track-guqin-pingsha',
    title: '古琴《平沙落雁》',
    composer: '传统琴曲',
    performer: '子佩',
    bilibiliBvid: 'BV1TQ4y1875q',
    category: '中国传统音乐',
    period: null,
    durationText: '约 7 分钟',
    searchKeywords: '古琴 平沙落雁 名家 演奏',
    moods: ['irritability', 'anxiety', 'quiet', 'sacred'],
    guide: {
      intro: '把视线放远一点。音乐会为眼前的烦扰重新安排尺度。',
      firstImpression:
        '琴声低回舒展，时而像雁群远去，时而只剩一条细微余音。它不制造空旷，而是让空旷自己出现。',
      background:
        '《平沙落雁》流传谱本众多，借雁落平沙描写开阔、安定的气象。不同演奏家会强调不同段落与呼吸。',
      listeningPoints:
        '注意散音的宽阔、按音的回转，以及声音之间被保留下来的距离。听完整个乐句，而不是抓住某个漂亮音色。',
      emotionalInterpretation:
        '烦躁会把注意力困在很近的地方。视野稍微拉远，并不会否定问题，却能让它不再占据全部世界。',
      reflectionQuestion: '如果把时间拉长到一年，眼前什么事情会显得没有那么巨大？',
      takeaway: '把视线放远，心里才有地方让一只雁慢慢落下。',
    },
  },
  {
    id: 'track-pipa-chunjiang',
    title: '《春江花月夜》',
    composer: '传统乐曲',
    performer: '吴玉霞',
    bilibiliBvid: 'BV1T7411y7q4',
    category: '中国传统音乐',
    period: null,
    durationText: '约 9 分钟',
    searchKeywords: '琵琶 春江花月夜 传统名曲',
    moods: ['sadness', 'loneliness', 'sacred', 'restart', 'nihilism'],
    guide: {
      intro: '让江水、月色与夜晚先成为一个空间，再把自己的情绪放进去。',
      firstImpression:
        '旋律婉转而开阔，既有近处的细节，也有远处的水面。它不是纯粹的喜悦，明亮中始终留着时间流逝的感受。',
      background:
        '乐曲由琵琶古曲发展而来，后来出现丝竹合奏等多种版本。标题借自古典诗意，但音乐并不对应某一首诗的具体句子。',
      listeningPoints:
        '听主题每次返回时怎样换一种装饰与音色。留意强弱变化如何让同一片景物显得忽近忽远。',
      emotionalInterpretation:
        '孤独有时并非缺少人，而是感到自身与世界断开。广阔的景象能让个人情绪重新进入更大的时间与自然。',
      reflectionQuestion: '此刻有什么比你的困扰更辽阔，也愿意暂时容纳它？',
      takeaway: '你不必独自装下所有感受，世界比此刻更辽阔。',
    },
  },
] as const;

const moodReason: Record<string, string> = {
  anxiety: '它不会增加刺激，而是用清晰的呼吸和结构为焦虑留出边界。',
  fatigue: '它不要求你振作，先允许注意力和身体慢慢卸下重量。',
  loneliness: '它不急着填满孤独，而是提供一段准确、克制的陪伴。',
  nihilism: '它不提供轻率答案，却让你在空白与消逝中仍感到人的深度。',
  sadness: '它让悲伤保持真实，同时避免把你推向更剧烈的宣泄。',
  'out-of-control': '它提示秩序不等于控制一切，而是找到仍能依靠的方向。',
  irritability: '它把过近、过热的注意力慢慢拉开，让情绪重新获得尺度。',
  chaos: '稳定的结构与流动会帮助散乱的注意力重新找到落点。',
  quiet: '声音中的停顿和余白，允许你暂时从外界退后一步。',
  strength: '它的力量来自持续与展开，而不是强迫自己立刻昂扬。',
  restart: '它把开始还原为下一个诚实而可完成的动作。',
  sacred: '它保留超越日常的空间，却不要求你接受单一解释。',
};

for (const [index, [slug, name, description]] of moods.entries()) {
  await prisma.moodCategory.upsert({
    where: { slug },
    create: { id: `mood-${slug}`, slug, name, description, sortOrder: index + 1 },
    update: { name, description, sortOrder: index + 1 },
  });
}

for (const track of tracks) {
  const bilibiliUrl = `https://www.bilibili.com/video/${track.bilibiliBvid}/`;
  const existing = await prisma.track.findUnique({ where: { id: track.id } });
  const upgradeUnverifiedLink = !existing || existing.bilibiliUrl.includes('search.bilibili.com');
  const saved = await prisma.track.upsert({
    where: { id: track.id },
    create: {
      id: track.id,
      title: track.title,
      composer: track.composer,
      performer: track.performer,
      category: track.category,
      period: track.period,
      durationText: track.durationText,
      bilibiliUrl,
      bilibiliBvid: track.bilibiliBvid,
      searchKeywords: track.searchKeywords,
      difficulty: 1,
      status: 'PUBLISHED',
    },
    update: {
      title: track.title,
      composer: track.composer,
      performer: track.performer,
      category: track.category,
      period: track.period,
      durationText: track.durationText,
      searchKeywords: track.searchKeywords,
      ...(upgradeUnverifiedLink ? { bilibiliUrl, bilibiliBvid: track.bilibiliBvid } : {}),
    },
  });
  await prisma.guide.upsert({
    where: { trackId: saved.id },
    create: { trackId: saved.id, title: '先别急着听懂', ...track.guide },
    update: { title: '先别急着听懂', ...track.guide },
  });
  await prisma.trackMood.deleteMany({ where: { trackId: saved.id } });
  await prisma.trackMood.createMany({
    data: track.moods.map((slug, index) => ({
      trackId: saved.id,
      moodId: `mood-${slug}`,
      weight: 92 - index * 5,
      reason: moodReason[slug]!,
    })),
  });
}

const username = process.env.ADMIN_USERNAME ?? 'admin';
const password = process.env.ADMIN_PASSWORD;
if (password) {
  await prisma.adminUser.upsert({
    where: { username },
    create: { username, passwordHash: await argon2.hash(password) },
    update: { passwordHash: await argon2.hash(password) },
  });
} else {
  console.warn('ADMIN_PASSWORD 未设置，已跳过管理员初始化。');
}

await prisma.$disconnect();
