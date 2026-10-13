import json

new_kanji = [
  {
    "kanji": "星",
    "meanings": ["star"],
    "onyomi": ["セイ", "ショウ"],
    "kunyomi": ["ほし"],
    "level": "N4",
    "vocabulary": [
      {"word": "星", "reading": "ほし", "meaning": "star"}
    ]
  },
  {
    "kanji": "雪",
    "meanings": ["snow"],
    "onyomi": ["セツ"],
    "kunyomi": ["ゆき"],
    "level": "N5",
    "vocabulary": [
      {"word": "雪", "reading": "ゆき", "meaning": "snow"}
    ]
  },
  {
    "kanji": "雲",
    "meanings": ["cloud"],
    "onyomi": ["ウン"],
    "kunyomi": ["くも"],
    "level": "N4",
    "vocabulary": [
      {"word": "雲", "reading": "くも", "meaning": "cloud"}
    ]
  },
  {
    "kanji": "晴",
    "meanings": ["clear up"],
    "onyomi": ["セイ"],
    "kunyomi": ["は.れる", "は.れ"],
    "level": "N4",
    "vocabulary": [
      {"word": "晴れ", "reading": "はれ", "meaning": "clear weather"}
    ]
  },
  {
    "kanji": "風",
    "meanings": ["wind", "air", "style"],
    "onyomi": ["フウ", "フ"],
    "kunyomi": ["かぜ", "かざ"],
    "level": "N4",
    "vocabulary": [
      {"word": "風", "reading": "かぜ", "meaning": "wind"}
    ]
  },
  {
    "kanji": "飛",
    "meanings": ["fly", "skip"],
    "onyomi": ["ヒ"],
    "kunyomi": ["と.ぶ", "と.ばす"],
    "level": "N3",
    "vocabulary": [
      {"word": "飛行機", "reading": "ひこうき", "meaning": "airplane"}
    ]
  },
  {
    "kanji": "鳴",
    "meanings": ["chirp", "cry", "bark", "sound"],
    "onyomi": ["メイ"],
    "kunyomi": ["な.く", "な.る"],
    "level": "N3",
    "vocabulary": [
      {"word": "鳴く", "reading": "なく", "meaning": "to chirp / cry"}
    ]
  },
  {
    "kanji": "交",
    "meanings": ["mingle", "mixing", "association"],
    "onyomi": ["コウ"],
    "kunyomi": ["まじ.わる", "ま.ざる"],
    "level": "N3",
    "vocabulary": [
      {"word": "交差点", "reading": "こうさてん", "meaning": "intersection"}
    ]
  },
  {
    "kanji": "流",
    "meanings": ["current", "a sink", "flow"],
    "onyomi": ["リュウ", "ル"],
    "kunyomi": ["なが.れる", "なが.す"],
    "level": "N3",
    "vocabulary": [
      {"word": "流れる", "reading": "ながれる", "meaning": "to flow"}
    ]
  },
  {
    "kanji": "消",
    "meanings": ["extinguish", "blow out", "turn off"],
    "onyomi": ["ショウ"],
    "kunyomi": ["き.える", "け.す"],
    "level": "N3",
    "vocabulary": [
      {"word": "消す", "reading": "けす", "meaning": "to erase / turn off"}
    ]
  },
  {
    "kanji": "防",
    "meanings": ["ward off", "defend", "protect"],
    "onyomi": ["ボウ"],
    "kunyomi": ["ふせ.ぐ"],
    "level": "N2",
    "vocabulary": [
      {"word": "予防", "reading": "よぼう", "meaning": "prevention"}
    ]
  },
  {
    "kanji": "規",
    "meanings": ["standard", "measure"],
    "onyomi": ["キ"],
    "kunyomi": [],
    "level": "N2",
    "vocabulary": [
      {"word": "規則", "reading": "きそく", "meaning": "rule"}
    ]
  },
  {
    "kanji": "則",
    "meanings": ["rule", "follow", "based on"],
    "onyomi": ["ソク"],
    "kunyomi": ["のっと.る"],
    "level": "N2",
    "vocabulary": [
      {"word": "原則", "reading": "げんそく", "meaning": "principle"}
    ]
  },
  {
    "kanji": "備",
    "meanings": ["equip", "provision", "preparation"],
    "onyomi": ["ビ"],
    "kunyomi": ["そな.える", "そな.わる"],
    "level": "N2",
    "vocabulary": [
      {"word": "準備", "reading": "じゅんび", "meaning": "preparation"}
    ]
  },
  {
    "kanji": "増",
    "meanings": ["increase", "add"],
    "onyomi": ["ゾウ"],
    "kunyomi": ["ま.す", "ふ.える", "ふ.やす"],
    "level": "N2",
    "vocabulary": [
      {"word": "増加", "reading": "ぞうか", "meaning": "increase"}
    ]
  }
]

file_path = 'src/data/kanji.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the end of the validKanjiData array
end_index = content.rfind(']')

if end_index != -1:
    new_data_str = json.dumps(new_kanji, indent=2, ensure_ascii=False)
    # Remove the brackets from the json array
    new_data_str = new_data_str[1:-1]
    
    modified_content = content[:end_index].rstrip()
    if modified_content.endswith('}'):
        modified_content += ','
    
    modified_content += '\n' + new_data_str + '\n' + content[end_index:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    print(f'Successfully added {len(new_kanji)} new kanji')
else:
    print('Could not find the end of the array')
