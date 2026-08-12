// E:\Projects\Rocklab1\coach-portal\src\data\mockData.js

export const INITIAL_COACHES = [
  { id: 'c1', name: 'Alex (Admin)', nickname: 'Alex', role: 'Admin', tier: 'Admin', assistRate: 0, leadRate: 0, paynow: '', telegram: '', telegramId: '', certs: {}, email: 'admin@rocklab.co', password: 'pass', status: 'Active', sncsLevel: 'L1', sncsExpiry: '', moeExpiry: '', faExpiry: '' },
  { id: 'c2', name: 'John Davies', nickname: 'Johnny D', role: 'Coach', tier: 'Senior Coach', assistRate: 35, leadRate: 50, paynow: '91234567', telegram: '@johndavies', telegramId: '123456789', sncsLevel: 'Cat1', sncsExpiry: '2027-01-15', moeExpiry: '2027-12-01', faExpiry: '2026-05-15', certs: { sncs: 'sncs_level3.jpg', moe: 'moe_reg.jpg', firstAid: 'first_aid_2024.jpg' }, email: 'john@rocklab.co', password: 'pass', status: 'Active' },
  { id: 'c3', name: 'Sarah Lee', nickname: 'Sarah', role: 'Coach', tier: 'Senior Coach', assistRate: 35, leadRate: 45, paynow: '81234567', telegram: '@sarahclimbs', telegramId: '987654321', sncsLevel: 'WS', sncsExpiry: '2026-10-10', moeExpiry: '2026-11-01', faExpiry: '2027-08-20', certs: { sncs: 'sncs_level2.jpg', moe: 'moe_reg.jpg', firstAid: 'fa.jpg' }, email: 'sarah@rocklab.co', password: 'pass', status: 'Needs Vetting' },
  { id: 'c4', name: 'Mike Chen', nickname: 'Mikey', role: 'Coach', tier: 'Junior Coach', assistRate: 25, leadRate: 0, paynow: '', telegram: '', telegramId: '', sncsLevel: 'L1', sncsExpiry: '', moeExpiry: '', faExpiry: '', certs: {}, email: 'mike@rocklab.co', password: 'temp_password_123', status: 'Pending' },
];

export const INITIAL_SCHOOLS = [
  { id: 'sch1', name: 'East Coast Primary', address: '123 East Coast Rd', email: 'finance@ecp.edu.sg', leadRate: 90, assistRate: 75, sop: 'ecp_guidelines.jpg' },
  { id: 'sch2', name: 'Jurong West Sec', address: '456 Jurong West Ave 1', email: 'admin@jws.edu.sg', leadRate: 95, assistRate: 80, sop: null },
  { id: 'sch3', name: 'Climb@T3 Facility', address: 'Changi Airport T3 B3', email: 'billing@climbat3.sg', leadRate: 85, assistRate: 70, sop: 't3_sop_2026.png' }
];

export const INITIAL_SHIFTS = [
  { id: 's1', day: 5, time: '14:00 - 16:00', duration: 2, schoolId: 'sch1', reqLead: 1, reqAssist: 2, assignedLead: [], assignedAssist: [], year: 2026, month: 4 },
  { id: 's2', day: 12, time: '15:00 - 18:00', duration: 3, schoolId: 'sch2', reqLead: 1, reqAssist: 1, assignedLead: ['c2'], assignedAssist: [], year: 2026, month: 4 }
];