export interface DemoCase {
  id: string;
  name: string;
  gender: 'male' | 'female';
  date: string;
  birthDate: string;
  type: 'bazi';
}

export const DEMO_CASES: DemoCase[] = [
  {
    id: 'demo-1',
    name: '演示案例1',
    gender: 'female',
    date: '1998年12月19日',
    birthDate: '1998-12-19T00:00:00',
    type: 'bazi',
  },
  {
    id: 'demo-2',
    name: '演示案例2',
    gender: 'male',
    date: '1985年3月15日',
    birthDate: '1985-03-15T12:00:00',
    type: 'bazi',
  },
];
