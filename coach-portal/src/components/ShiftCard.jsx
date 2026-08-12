import React from 'react';
import { Pencil, Clock, MapPin, BookOpen, Plus, X, School } from 'lucide-react';

export default function ShiftCard({ 
  shift, viewType, schools, currentUser, monthNames, month, year, 
  setEditingShift, handleUnassign, setAssignmentModal, getCoachInitials 
}) {
  const isEvent = shift.type === 'event';
  const school = schools.find(s => s.id === shift.schoolId);
  const isCoachView = viewType === 'coach';
  
  let eventTimeSummary = '';
  let billableSummary = '';
  
  if (isEvent) {
    eventTimeSummary = shift.time || `${shift.startTime} - ${shift.endTime}`;
    if (shift.coachPaidHours !== undefined || shift.schoolBillableHours !== undefined) {
      const cPaid = shift.coachPaidHours !== undefined ? shift.coachPaidHours : shift.duration;
      const sBill = shift.schoolBillableHours !== undefined ? shift.schoolBillableHours : shift.duration;
      billableSummary = `Paid: ${cPaid}h / Bill: ${sBill}h`;
    }
  }

  let role = ''; let roleColor = ''; let totalShiftPay = 0;
  if (isCoachView && currentUser) {
    const isLead = shift.assignedLead?.includes(currentUser.id);
    const isAssist = shift.assignedAssist?.includes(currentUser.id);
    
    if (isLead || isAssist) {
      role = isLead ? 'Lead Coach' : 'Assist Coach';
      roleColor = isLead ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-green-100 text-green-700 border-green-200';
      
      const monthKey = `${year}-${month}`;
      const paymentInfo = currentUser.paymentStatus?.[monthKey];
      const lockedLeadRate = (typeof paymentInfo === 'object' && paymentInfo.lockedLeadRate !== undefined) ? paymentInfo.lockedLeadRate : null;
      const lockedAssistRate = (typeof paymentInfo === 'object' && paymentInfo.lockedAssistRate !== undefined) ? paymentInfo.lockedAssistRate : null;

      const payrollHours = shift.type === 'event' ? (shift.coachPaidHours !== undefined ? shift.coachPaidHours : shift.duration) : shift.duration;
      let rate = 0;
      if (shift.type === 'event') {
        rate = isLead ? (shift.coachLeadPayRate || 0) : (shift.coachAssistPayRate || 0);
      } else {
        if (isLead) {
          rate = lockedLeadRate !== null ? lockedLeadRate : (currentUser.leadRate || 0);
        } else {
          rate = lockedAssistRate !== null ? lockedAssistRate : (currentUser.assistRate || 0);
        }
      }
      totalShiftPay = rate * payrollHours;
    }
  }

  const cardBaseClass = isEvent 
    ? "bg-slate-900 border-slate-800 text-white" 
    : "bg-white border-gray-200 text-gray-800";

  return (
    <div className={`${cardBaseClass} border rounded-xl shadow-sm hover:shadow-md transition-shadow group relative ${isCoachView ? 'p-5 flex flex-col md:flex-row md:items-center gap-5' : 'p-2 md:p-3'}`}
      onClick={() => !isCoachView && setEditingShift(shift)}
    >
      {!isCoachView && (
        <button 
          onClick={(e) => { e.stopPropagation(); setEditingShift(shift); }} 
          className="absolute top-2 right-2 p-1.5 bg-gray-100 text-gray-500 hover:bg-slate-800 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-all z-10" 
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {isCoachView && (
        <div className={`${isEvent ? 'bg-emerald-600' : 'bg-slate-800'} rounded-xl p-3 md:p-4 text-center min-w-[85px] shrink-0 shadow-md transform group-hover:scale-105 transition-transform`}>
          <div className={`text-xs font-bold ${isEvent ? 'text-white' : 'text-teal-400'} uppercase tracking-widest mb-1`}>{monthNames[month].substring(0,3)}</div>
          <div className="text-3xl font-black text-white leading-none">{shift.day}</div>
        </div>
      )}

      <div className="flex-grow">
        {isCoachView ? (
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-bold px-2 py-1 rounded-md border ${roleColor}`}>{role}</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${isEvent ? 'bg-white/10 text-emerald-400' : 'bg-gray-100 text-gray-600'}`}>+ ${totalShiftPay}</span>
            {billableSummary && <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">{billableSummary}</span>}
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 font-bold text-xs md:text-sm mb-1 pr-6 ${isEvent ? 'text-emerald-400' : 'text-gray-800'}`}>
            <Clock className={`w-3 h-3 shrink-0 ${isEvent ? 'text-emerald-400' : 'text-gray-400'}`} /> 
            <span className="truncate">{isEvent ? eventTimeSummary : shift.time}</span> 
            <span className={`${isEvent ? 'text-white/40' : 'text-gray-400'} font-normal shrink-0 ml-1`}>
              ({shift.duration}h{billableSummary ? ` / ${billableSummary}` : ''})
            </span>
          </div>
        )}

        <div className={`flex items-start gap-1.5 ${isCoachView ? (isEvent ? 'text-white font-bold text-lg mt-1' : 'text-gray-900 font-bold text-lg mt-1') : (isEvent ? 'text-white text-xs mb-1 pr-6' : 'text-gray-500 text-xs mb-3 pr-6')}`}>
          {isEvent ? <MapPin className={`shrink-0 ${isCoachView ? 'w-4 h-4 text-emerald-400 mt-1' : 'w-3 h-3 mt-0.5 text-emerald-400'}`} /> : <MapPin className={`shrink-0 ${isCoachView ? 'w-4 h-4 text-gray-400 mt-1' : 'w-3 h-3 mt-0.5'}`} />}
          <span className="line-clamp-2 leading-tight">{isEvent ? shift.name : (school ? school.name : 'Unknown Location')}</span>
        </div>

        {!isCoachView && isEvent && school && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400/80 mb-2 uppercase tracking-tighter">
            <School className="w-2.5 h-2.5" /> Billed to: {school.name}
          </div>
        )}

        {!isCoachView && isEvent && !school && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-tighter italic">
            No venue linked (Not invoiced)
          </div>
        )}

        {isCoachView ? (
           <div className={`${isEvent ? 'text-white/60' : 'text-gray-500'} mt-1.5 flex items-center gap-4 text-sm font-medium`}>
             <span className="flex items-center gap-1.5"><Clock className={`w-4 h-4 ${isEvent ? 'text-emerald-400' : 'text-gray-400'}`} /> {isEvent ? eventTimeSummary : shift.time}</span>
             <span className="text-gray-300">•</span>
             <span className="flex items-center gap-1"><span className={`font-bold ${isEvent ? 'text-white' : 'text-gray-700'}`}>{shift.duration}</span> hours</span>
           </div>
        ) : (          <div className="flex flex-wrap gap-1.5">
            {[...Array(shift.reqLead || 0)].map((_, i) => {
              const assignedId = shift.assignedLead?.[i];
              return assignedId ? (
                <div key={`lead-${i}`} onClick={(e) => { e.stopPropagation(); handleUnassign(shift.id, assignedId, 'Lead'); }} className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-red-500 hover:scale-105 group/btn transition-all shadow-sm"><span className="group-hover/btn:hidden">{getCoachInitials(assignedId)}</span><span className="hidden group-hover/btn:block text-lg leading-none">×</span></div>
              ) : (
                <button key={`lead-empty-${i}`} onClick={(e) => { e.stopPropagation(); setAssignmentModal({ isOpen: true, shiftId: shift.id, roleType: 'Lead' }); }} className="w-8 h-8 rounded-full bg-pink-50 border border-pink-300 text-pink-500 flex items-center justify-center hover:bg-pink-500 hover:text-white hover:scale-105 transition-all shadow-sm"><Plus className="w-4 h-4" /></button>
              );
            })}
            {[...Array(shift.reqAssist || 0)].map((_, i) => {
              const assignedId = shift.assignedAssist?.[i];
              return assignedId ? (
                <div key={`assist-${i}`} onClick={(e) => { e.stopPropagation(); handleUnassign(shift.id, assignedId, 'Assist'); }} className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-red-500 hover:scale-105 group/btn transition-all shadow-sm"><span className="group-hover/btn:hidden">{getCoachInitials(assignedId)}</span><span className="hidden group-hover/btn:block text-lg leading-none">×</span></div>
              ) : (
                <button key={`assist-empty-${i}`} onClick={(e) => { e.stopPropagation(); setAssignmentModal({ isOpen: true, shiftId: shift.id, roleType: 'Assist' }); }} className="w-8 h-8 rounded-full bg-green-50 border border-green-300 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white hover:scale-105 transition-all shadow-sm"><Plus className="w-4 h-4" /></button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}