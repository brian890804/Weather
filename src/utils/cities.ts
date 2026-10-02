export interface CityConfig {
  name: string;
  id: string;
}

export const CITIES: CityConfig[] = [
  { name: '基隆市', id: 'F-D0047-049' },
  { name: '臺北市', id: 'F-D0047-061' },
  { name: '新北市', id: 'F-D0047-069' },
  { name: '桃園市', id: 'F-D0047-005' },
  { name: '新竹市', id: 'F-D0047-053' },
  { name: '新竹縣', id: 'F-D0047-009' },
  { name: '苗栗縣', id: 'F-D0047-013' },
  { name: '臺中市', id: 'F-D0047-073' },
  { name: '彰化縣', id: 'F-D0047-017' },
  { name: '南投縣', id: 'F-D0047-021' },
  { name: '雲林縣', id: 'F-D0047-025' },
  { name: '嘉義市', id: 'F-D0047-057' },
  { name: '嘉義縣', id: 'F-D0047-029' },
  { name: '臺南市', id: 'F-D0047-077' },
  { name: '高雄市', id: 'F-D0047-065' },
  { name: '屏東縣', id: 'F-D0047-033' },
  { name: '宜蘭縣', id: 'F-D0047-001' },
  { name: '花蓮縣', id: 'F-D0047-041' },
  { name: '臺東縣', id: 'F-D0047-037' },
  { name: '澎湖縣', id: 'F-D0047-045' },
  { name: '金門縣', id: 'F-D0047-085' },
  { name: '連江縣（馬祖）', id: 'F-D0047-081' },
];

export const REGIONS: { region: string; cities: string[] }[] = [
  { region: '全部', cities: CITIES.map((c) => c.name) },
  { region: '北部', cities: ['基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'] },
  { region: '中部', cities: ['苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣'] },
  { region: '南部', cities: ['嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣'] },
  { region: '東部', cities: ['花蓮縣', '臺東縣'] },
  { region: '離島', cities: ['澎湖縣', '金門縣', '連江縣（馬祖）'] },
];
