import sqlite3

conn = sqlite3.connect("./Chinese-English/Chinese-English.sqlite3")

cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) FROM dictionary")
print("Number of entries in total:", cursor.fetchone())

cursor.execute("""
    SELECT simp, trad, COUNT(simp) AS n,
        SUBSTR(GROUP_CONCAT(translations, " | "), 0, 120) AS tsl
    FROM dictionary
    GROUP BY simp, trad
    HAVING n > 1
    ORDER BY n DESC
""")

rows = list(cursor.fetchall())
print("Number of 2+ entries with equal simp/trad fields:", len(rows))
for row in rows[:10]:
    print(row)

cursor.execute("""
    SELECT simp, pinyin, COUNT(simp) AS n,
        SUBSTR(GROUP_CONCAT(translations, " | "), 0, 120) AS tsl
    FROM dictionary
    GROUP BY simp, pinyin
    HAVING n > 1
    ORDER BY n DESC
""")
rows = list(cursor.fetchall())
print("Number of 2+ entries with equal simp/pinyin fields:", len(rows))
for row in rows[:10]:
    print(row)

cursor.execute("""
    SELECT simp, trad, pinyin, COUNT(simp) AS n,
        SUBSTR(GROUP_CONCAT(translations, " | "), 0, 120) AS tsl
    FROM dictionary
    GROUP BY simp, trad, pinyin
    HAVING n > 1
    ORDER BY n DESC
""")
rows = list(cursor.fetchall())
print("Number of 2+ entries with equal simp/trad/pinyin fields:", len(rows))
for row in rows[:10]:
    print(row)
