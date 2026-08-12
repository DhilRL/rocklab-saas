import React from 'react';
import { Printer, X } from 'lucide-react';

export default function InvoiceModal({ 
  invoiceSchoolId, setInvoiceSchoolId, shifts, schools, coaches, monthNames, month, year
}) {
  if (!invoiceSchoolId) return null;

  const currentMonthShifts = shifts.filter(s => {
    const shiftMonth = s.month !== undefined ? s.month : new Date().getMonth();
    const shiftYear = s.year !== undefined ? s.year : new Date().getFullYear();
    return Number(shiftMonth) === Number(month) && Number(shiftYear) === Number(year);
  });

  const getInvoiceDataForSchool = (schoolId) => {
    const school = schools.find(s => String(s.id) === String(schoolId));
    let leadHours = 0; let assistHours = 0;
    const leadDatesSet = new Set(); const assistDatesSet = new Set();
    
    currentMonthShifts.filter(s => String(s.schoolId) === String(schoolId)).forEach(shift => {
      const billableHours = shift.type === 'event' ? (shift.schoolBillableHours !== undefined ? shift.schoolBillableHours : shift.duration) : shift.duration;
      
      if (shift.assignedLead?.length > 0) {
        leadHours += (shift.assignedLead.length * Number(billableHours));
        leadDatesSet.add(shift.day);
      }
      if (shift.assignedAssist?.length > 0) {
        assistHours += (shift.assignedAssist.length * Number(billableHours));
        assistDatesSet.add(shift.day);
      }
    });

    const formatDates = (dateSet) => {
      if (dateSet.size === 0) return 'None';
      return Array.from(dateSet).sort((a, b) => a - b).map(d => `${d} ${monthNames[month].substring(0, 3)}`).join(', ');
    };

    const leadSubtotal = leadHours * (school?.leadRate || 0);
    const assistSubtotal = assistHours * (school?.assistRate || 0);

    return {
      school, leadHours, assistHours,
      leadSubtotal, assistSubtotal,
      grandTotal: leadSubtotal + assistSubtotal,
      leadDatesStr: formatDates(leadDatesSet),
      assistDatesStr: formatDates(assistDatesSet)
    };
  };

  const { school, leadHours, assistHours, leadSubtotal, assistSubtotal, grandTotal, leadDatesStr, assistDatesStr } = getInvoiceDataForSchool(invoiceSchoolId);
  if (!school) return null;
  
  const today = new Date();
  const invoiceDate = today.toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const dayStr = String(today.getDate()).padStart(2, '0');
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const yearStr = today.getFullYear();
  const schoolCode = (school.schoolCode || 'RLC').toUpperCase();
  const invoiceNumber = `${schoolCode}-${dayStr}${monthStr}${yearStr}`;

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4 portrait; }
          body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-modal-overlay { position: static !important; display: block !important; background: transparent !important; padding: 0 !important; margin: 0 !important; }
          .print-modal-card { position: static !important; display: block !important; max-width: 100% !important; width: 100% !important; max-height: none !important; box-shadow: none !important; border: 2px solid #cbd5e1 !important; border-radius: 12px !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          #printable-invoice { width: 100% !important; max-width: 100% !important; padding: 40px !important; overflow: visible !important; }
          .print-hide { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-8 print-modal-overlay">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] print-modal-card">
          <div className="bg-slate-100 p-3 flex justify-between items-center border-b border-gray-200 print-hide">
            <span className="text-sm font-semibold text-slate-500 px-2">Invoice Preview - {school.name}</span>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded-md text-sm font-bold hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 flex items-center gap-1.5 shadow-sm transition-colors">
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>
              <button onClick={() => setInvoiceSchoolId(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-sm flex items-center gap-1.5 transition-colors">
                 Close <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-8 sm:p-12 overflow-y-auto bg-white" id="printable-invoice">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-8 border-b border-gray-200 pb-8 mb-8">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">ROCK LAB COLLECTIVE</h1>
                <div className="text-xs font-bold text-slate-500 mt-2 space-y-0.5">
                  <p className="text-slate-900">UEN / VENDOR ID: 53510583E</p>
                  <p>14 Taman Ho Swee, #08-53, Singapore 161014</p>
                  <p>+65 9173 0663 | joy@rocklab.co</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <h2 className="text-2xl font-bold text-teal-600 mb-1 tracking-widest">INVOICE</h2>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-tighter">No: <span className="text-gray-900 font-bold">{invoiceNumber}</span></p>
                <p className="text-sm text-gray-500 font-medium">Date: <span className="text-gray-900">{invoiceDate}</span></p>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Billed To</h3>
              <p className="text-xl font-bold text-gray-900">{school.name}</p>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{school.address}</p>
              {school.email && <p className="text-sm text-teal-600 mt-1 font-medium">{school.email}</p>}
            </div>

            <div className="rounded-xl overflow-hidden border border-gray-200 print:border-gray-400">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-slate-500 print:bg-transparent print:border-gray-800 print:border-b-2 print:text-black">
                    <th className="p-4">Description</th>
                    <th className="p-4 text-center">Total Hours / Units</th>
                    <th className="p-4 text-right">Agreed Rate</th>
                    <th className="p-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                  {/* Lead Row */}
                  {(leadHours > 0) && (
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-gray-900">Lead Coach</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium italic">Instructional leadership for {monthNames[month]} sessions</p>
                        <p className="text-[10px] text-slate-700 mt-2 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded print:bg-transparent print:border print:border-gray-300">Dates: {leadDatesStr}</p>
                      </td>
                      <td className="p-4 text-center font-bold text-gray-800">{leadHours}</td>
                      <td className="p-4 text-right text-gray-600 font-medium">${(school?.leadRate || 0).toFixed(2)} / hr</td>
                      <td className="p-4 text-right font-bold text-gray-900">${leadSubtotal.toFixed(2)}</td>
                    </tr>
                  )}
                  {/* Assist Row */}
                  {(assistHours > 0) && (
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-gray-900">Assistant Coach</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium italic">Safety management for {monthNames[month]} sessions</p>
                        <p className="text-[10px] text-slate-700 mt-2 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded print:bg-transparent print:border print:border-gray-300">Dates: {assistDatesStr}</p>
                      </td>
                      <td className="p-4 text-center font-bold text-gray-800">{assistHours}</td>
                      <td className="p-4 text-right text-gray-600 font-medium">${(school?.assistRate || 0).toFixed(2)} / hr</td>
                      <td className="p-4 text-right font-bold text-gray-900">${assistSubtotal.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <div className="w-full sm:w-1/2 lg:w-1/3">
                <div className="flex justify-between items-center py-3 border-b border-gray-100 print:border-gray-300">
                  <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Subtotal</span>
                  <span className="text-gray-900 font-bold">${grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-4 text-xl">
                  <span className="font-bold text-gray-900 uppercase tracking-tighter">Grand Total</span>
                  <span className="font-black text-teal-600">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-16 text-center text-xs text-gray-400 border-t border-gray-100 pt-8 print:border-gray-300">
              <p className="font-bold text-gray-500 mb-1">PAYMENT METHOD WILL BE VIA "VENDOR@sg"</p>
              <p className="italic">Thank you for your continued partnership with ROCK LAB COLLECTIVE. Payment is due within 30 days.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
