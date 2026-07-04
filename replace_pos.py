import re

with open('app/pos/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Make search container padding more compact
content = content.replace(
    '<div className="px-6 pt-6 pb-4">',
    '<div className="px-5 pt-5 pb-3">'
)
print('Search container padding reduced')

# 2. Make search bar inner padding more compact
content = content.replace(
    'flex items-center gap-3 bg-white border-2 border-[#e5e7eb] rounded-2xl px-5 py-4',
    'flex items-center gap-2.5 bg-white border-2 border-[#e5e7eb] rounded-2xl px-4 py-3'
)
print('Search bar inner padding reduced')

# 3. Reduce search input font size slightly
content = content.replace(
    'flex-1 bg-transparent text-[18px] text-[#111827] placeholder:text-[#9ca3af] outline-none',
    'flex-1 bg-transparent text-[16px] text-[#111827] placeholder:text-[#9ca3af] outline-none'
)
print('Search input font size reduced')

# 4. Reduce search icon size
content = content.replace(
    '<Search className="w-6 h-6 text-[#9ca3af] shrink-0" />',
    '<Search className="w-5 h-5 text-[#9ca3af] shrink-0" />'
)
print('Search icon size reduced')

# 5. Reduce search results padding to match
content = content.replace(
    'flex-1 overflow-y-auto px-6 pb-6',
    'flex-1 overflow-y-auto px-5 pb-5'
)
print('Search results padding reduced')

# 6. Reduce empty state padding
content = content.replace(
    'flex-1 flex flex-col items-center justify-center gap-4 text-center px-6',
    'flex-1 flex flex-col items-center justify-center gap-4 text-center px-5'
)
print('Empty state padding reduced')

with open('app/pos/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('File saved successfully')
