import React, { useState } from 'react';
import { Plus, Calendar as CalendarIcon, DollarSign, Users, Pencil, School, BookOpen, Receipt, FileText, AlertCircle, ShieldCheck, ChevronLeft, ChevronRight, Check, ChevronDown, ChevronUp, Download } from 'lucide-react';
import ShiftCard from './ShiftCard';

export default function AdminDashboard({ 
  activeTab, setActiveTab, shifts, coaches, schools, calendarGrid, currentDay, weekDays, monthNames, month, year, setMonth, setYear,
  setEditingShift, setEditingSchool, setEditingCoach, setAssignmentModal, setInvoiceSchoolId, handleUnassign, openBatchModal,
  openEventModal, handleSaveCoachEdit
}) {
  const [payrollMonth, setPayrollMonth] = useState(month);
  const [payrollYear, setPayrollYear] = useState(year);
  const [expandedCoachId, setExpandedCoachId] = useState(null);
  const [undoConfirmCoach, setUndoConfirmCoach] = useState(null);

  const getCoachInitials = (id) => { const c = coaches.find(x => x.id === id); return c ? (c.nickname || c.name || '??').substring(0, 2).toUpperCase() : '??'; };

  const currentMonthShifts = shifts.filter(s => {
    const shiftMonth = s.month !== undefined ? s.month : new Date().getMonth();
    const shiftYear = s.year !== undefined ? s.year : new Date().getFullYear();
    return shiftMonth === month && shiftYear === year;
  });

  const getCoachPayBreakdown = (id, targetMonth, targetYear) => {
    const coach = coaches.find(x => x.id === id);
    if (!coach || coach.role === 'Admin') return [];
    
    // Check for locked rates
    const monthKey = `${targetYear}-${targetMonth}`;
    const paymentInfo = coach.paymentStatus?.[monthKey];
    const isLocked = typeof paymentInfo === 'object' && paymentInfo.status === 'Paid';
    
    const lockedLeadRate = isLocked ? paymentInfo.lockedLeadRate : null;
    const lockedAssistRate = isLocked ? paymentInfo.lockedAssistRate : null;

    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    return shifts
      .filter(s => s.day >= 1 && s.day <= daysInMonth && s.month === targetMonth && s.year === targetYear)
      .filter(s => s.assignedLead?.includes(id) || s.assignedAssist?.includes(id))
      .map(s => {
        let role = '';
        let rate = 0;
        let venueName = '';

        const isLead = s.assignedLead?.includes(id);
        role = isLead ? 'Lead' : 'Assist';
        
        if (s.type === 'event') {
          rate = isLead ? (s.coachLeadPayRate || 0) : (s.coachAssistPayRate || 0);
        } else {
          // Use locked rate if available, otherwise current coach rate
          if (isLead) {
            rate = lockedLeadRate !== null ? lockedLeadRate : (coach.leadRate || 0);
          } else {
            rate = lockedAssistRate !== null ? lockedAssistRate : (coach.assistRate || 0);
          }
        }
        
        const school = schools.find(sch => sch.id === s.schoolId);
        venueName = s.type === 'event' ? (s.name || school?.name || 'Event') : (school?.name || 'Unknown School');
        
        const dateObj = new Date(targetYear, targetMonth, s.day);
        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

        // For events, use coachPaidHours for coach pay
        const payrollHours = s.type === 'event' ? (s.coachPaidHours !== undefined ? s.coachPaidHours : s.duration) : s.duration;

        return {
          id: s.id,
          date: `${s.day}/${targetMonth + 1}/${targetYear}`,
          dayOfWeek: dayOfWeek,
          time: s.time || 'N/A',
          schoolName: venueName,
          role: role,
          rate: rate,
          hours: payrollHours,
          total: payrollHours * rate,
          workingHours: s.duration
        };
      })
      .sort((a, b) => {
        const dayA = parseInt(a.date?.split('/')?.[0] || '0');
        const dayB = parseInt(b.date?.split('/')?.[0] || '0');
        return dayA - dayB;
      });
  };

  const getCoachPay = (id, targetMonth, targetYear) => {
    const breakdown = getCoachPayBreakdown(id, targetMonth, targetYear);
    return breakdown.reduce((sum, item) => sum + item.total, 0);
  };

  // --- NEW: Helper function to calculate school invoice totals ---
  const getSchoolInvoiceTotal = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    if (!school) return 0;
    let total = 0;
    currentMonthShifts.filter(s => s.schoolId === schoolId).forEach(shift => {
      // For events, use schoolBillableHours for school invoicing
      const billableHours = shift.type === 'event' ? (shift.schoolBillableHours !== undefined ? shift.schoolBillableHours : shift.duration) : shift.duration;
      
      if (shift.assignedLead?.length > 0) total += shift.assignedLead.length * billableHours * (school.leadRate || 0);
      if (shift.assignedAssist?.length > 0) total += shift.assignedAssist.length * billableHours * (school.assistRate || 0);
    });
    return total;
  };

  const handleExport = (type) => {
    const dataToExport = [];
    const targetYear = payrollYear;

    const relevantCoaches = coaches.filter(c => c.role === 'Coach');

    relevantCoaches.forEach(coach => {
      let breakdown = [];
      if (type === 'monthly') {
        breakdown = getCoachPayBreakdown(coach.id, payrollMonth, targetYear);
      } else {
        // Annual
        for (let m = 0; m < 12; m++) {
          const mBreakdown = getCoachPayBreakdown(coach.id, m, targetYear);
          breakdown = [...breakdown, ...mBreakdown];
        }
      }

      breakdown.forEach(item => {
        dataToExport.push({
          Coach: coach.name,
          Date: item.date,
          Day: item.dayOfWeek,
          Time: item.time,
          Venue: item.schoolName,
          Role: item.role,
          Rate: item.rate,
          Hours: item.hours,
          Total: item.total
        });
      });
    });

    if (dataToExport.length === 0) {
      alert("No data to export for this period.");
      return;
    }

    const headers = dataToExport.length > 0 ? Object.keys(dataToExport[0]) : [];
    if (headers.length === 0) {
      alert("No data headers found.");
      return;
    }
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_${type}_${targetYear}${type === 'monthly' ? '_' + (payrollMonth + 1) : ''}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueActiveSchoolIds = [...new Set(currentMonthShifts.map(s => s.schoolId))].filter(Boolean);

  const goToPrevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else { setMonth(month - 1); } };
  const goToNextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else { setMonth(month + 1); } };

  const MonthNavigation = ({ title, icon: Icon }) => (
    <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <Icon className="text-teal-500 w-6 h-6" />
        <h2 className="text-lg md:text-xl font-bold text-gray-800">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {activeTab === 'calendar' && (
          <div className="flex gap-2">
            <button 
              onClick={openEventModal}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
            >
              <CalendarIcon className="w-4 h-4 text-emerald-400" /> Add Event
            </button>
            <button 
              onClick={openBatchModal}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" /> Mass Add Shifts
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
          <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-1">
            <select 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              className="appearance-none bg-transparent font-bold text-gray-800 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer outline-none text-center min-w-[100px]"
            >
              {monthNames.map((name, i) => <option key={name} value={i}>{name}</option>)}
            </select>
            <select 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none bg-transparent font-bold text-gray-800 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer outline-none text-center"
            >
              {Array.from({ length: 11 }, (_, i) => (new Date().getFullYear() - 5) + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 active:scale-90"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );

  const checkExpiry = (dateStr) => {
    if (!dateStr) return { missing: true, expired: false, expiringSoon: false, invalid: false };
    const expDate = new Date(dateStr);
    
    // Protect against weird browser date formats
    if (isNaN(expDate.getTime())) return { missing: true, expired: false, expiringSoon: false, invalid: true };

    const today = new Date(); 
    const warningDate = new Date(); warningDate.setDate(today.getDate() + 60);
    return { 
      missing: false, invalid: false, expired: expDate < today, 
      expiringSoon: expDate >= today && expDate <= warningDate, 
      dateString: expDate.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) 
    };
  };

  const getCoachEligibility = (coach) => {
    if (coach.role === 'Admin') return { canLead: false, canAssist: false, reason: 'Admin account' };
    
    const moeStatus = checkExpiry(coach.moeExpiry);
    const hasValidMoe = !!coach.certs?.moe && !moeStatus.missing && !moeStatus.expired && !moeStatus.invalid;
    
    const faStatus = checkExpiry(coach.faExpiry);
    const hasValidFa = !!coach.certs?.firstAid && !faStatus.missing && !faStatus.expired && !faStatus.invalid;
    
    const hasLeadSncs = ['WS', 'Cat1', 'Cat2'].includes(coach.sncsLevel);
    const hasAssistSncs = ['L1', 'L2', 'L3'].includes(coach.sncsLevel);
    
    // Strict logic gating
    const canLead = hasLeadSncs && hasValidMoe && hasValidFa;
    const canAssist = (hasAssistSncs || hasLeadSncs) && hasValidMoe; 
    
    return { canLead, canAssist, hasValidMoe, hasLeadSncs, hasAssistSncs, moeStatus, faStatus, hasValidFa };
  };

  const renderCompliancePills = (coach) => {
    if (coach.role === 'Admin') return null;
    const eligibility = getCoachEligibility(coach);
    const pills = []; const warnings = []; let isSuspended = false;

    // 1. SNCS Pill
    let sncsClass = "bg-green-100 text-green-700 border-green-200";
    if (!eligibility.hasLeadSncs && !eligibility.hasAssistSncs) { 
      sncsClass = "bg-red-100 text-red-700 border-red-200"; warnings.push(`SNCS level not recognized`); 
    } else if (eligibility.hasLeadSncs) { 
      sncsClass = "bg-pink-100 text-pink-700 border-pink-200"; 
    }
    pills.push(<span key="sncs" className={`px-2 py-0.5 font-bold text-[10px] rounded uppercase tracking-wider border ${sncsClass}`}>{coach.sncsLevel || 'No SNCS'}</span>);

    // 2. MOE Pill
    if (eligibility.hasValidMoe) {
      let moeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
      if (eligibility.moeStatus.expiringSoon) { moeClass = "bg-orange-100 text-orange-700 border-orange-200"; warnings.push(`MOE expires soon`); }
      pills.push(<span key="moe" className={`px-2 py-0.5 font-bold text-[10px] rounded uppercase tracking-wider border ${moeClass}`}>MOE</span>);
    } else { 
      pills.push(<span key="moe" className="px-2 py-0.5 bg-red-100 text-red-700 border-red-200 font-bold text-[10px] rounded uppercase tracking-wider border">MOE MISSING/EXPIRED</span>); 
      warnings.push("MOE Registration is mandatory"); isSuspended = true; 
    }

    // 3. First Aid Pill (Diagnostic)
    if (eligibility.hasLeadSncs) {
      if (eligibility.hasValidFa) {
        let faClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
        if (eligibility.faStatus.expiringSoon) { faClass = "bg-orange-100 text-orange-700 border-orange-200"; warnings.push(`FA expires soon`); }
        pills.push(<span key="fa" className={`px-2 py-0.5 font-bold text-[10px] rounded uppercase tracking-wider border ${faClass}`}>FA VALID</span>);
      } else { 
        if (!coach.certs?.firstAid) {
          pills.push(<span key="fa" className="px-2 py-0.5 bg-red-100 text-red-700 border-red-200 font-bold text-[10px] rounded uppercase tracking-wider border">FA DOC MISSING</span>);
        } else if (eligibility.faStatus.missing || eligibility.faStatus.invalid) {
          pills.push(<span key="fa" className="px-2 py-0.5 bg-red-100 text-red-700 border-red-200 font-bold text-[10px] rounded uppercase tracking-wider border">FA DATE MISSING</span>);
        } else if (eligibility.faStatus.expired) {
          pills.push(<span key="fa" className="px-2 py-0.5 bg-red-100 text-red-700 border-red-200 font-bold text-[10px] rounded uppercase tracking-wider border">FA EXPIRED</span>);
        }
        warnings.push("First Aid required for Lead role"); 
      }
    }

    // 4. Role Badges & Pay Rates
    const roleBadges = []; const payRates = [];
    if (eligibility.canLead) {
      roleBadges.push(<span key="role-lead" className="px-2 py-0.5 bg-pink-600 text-white font-bold text-[10px] rounded uppercase tracking-wider shadow-sm">LEAD</span>);
      if (coach.leadRate > 0) payRates.push(<span key="pay-lead" className="text-xs font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">Lead: ${coach.leadRate}/hr</span>);
    }
    if (eligibility.canAssist) {
      roleBadges.push(<span key="role-assist" className="px-2 py-0.5 bg-green-600 text-white font-bold text-[10px] rounded uppercase tracking-wider shadow-sm">ASSIST</span>);
      if (coach.assistRate > 0) payRates.push(<span key="pay-assist" className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">Assist: ${coach.assistRate}/hr</span>);
    }

    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex flex-wrap gap-1.5 mb-2">{pills}</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {roleBadges.length > 0 ? roleBadges : <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-lg">Not eligible for any role</span>}
        </div>
        {payRates.length > 0 && <div className="flex flex-wrap gap-2 mb-3">{payRates}</div>}
        
        {coach.status === 'Pending' ? (
          <div className="flex items-start gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>Waiting for coach upload</span></div>
        ) : coach.status === 'Needs Vetting' ? (
          <div className="flex items-start gap-1.5 text-xs font-medium text-orange-800 bg-orange-100 p-2.5 rounded-lg border border-orange-300 shadow-sm"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>Needs Vetting. Click Edit to verify.</span></div>
        ) : isSuspended || (!eligibility.canLead && !eligibility.canAssist) ? (
          <div className="flex items-start gap-1.5 text-xs font-medium text-red-600 bg-red-50 p-2 rounded-lg border border-red-100"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><ul className="list-disc list-inside ml-1">{warnings.length > 0 ? warnings.map((w, i) => <li key={i}>{w}</li>) : <li>{eligibility.reason}</li>}</ul></div>
        ) : warnings.length > 0 ? (
          <div className="flex items-start gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 p-2 rounded-lg border border-orange-100"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><ul className="list-disc list-inside ml-1">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100"><ShieldCheck className="w-4 h-4 shrink-0" /> Cleared to Coach</div>
        )}
      </div>
    );
  };

  const goToPrevPayrollMonth = () => { if (payrollMonth === 0) { setPayrollMonth(11); setPayrollYear(payrollYear - 1); } else { setPayrollMonth(payrollMonth - 1); } };
  const goToNextPayrollMonth = () => { if (payrollMonth === 11) { setPayrollMonth(0); setPayrollYear(payrollYear + 1); } else { setPayrollMonth(payrollMonth + 1); } };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {coaches.filter(c => c.status === 'Needs Vetting').length > 0 && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 shadow-sm gap-4">
          <div className="flex items-center gap-2 font-bold"><AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />{coaches.filter(c => c.status === 'Needs Vetting').length} Coach Profile(s) require vetting!</div>
          <button onClick={() => { const coachToVet = coaches.find(c => c.status === 'Needs Vetting'); if (coachToVet) setEditingCoach(coachToVet); }} className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold transition-colors w-full sm:w-auto shadow-sm">Review Now</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div><h1 className="text-2xl md:text-3xl font-bold text-gray-900">Operations Dashboard</h1><p className="text-gray-500 mt-1 text-sm md:text-base">Manage schedules, staff, schools, payroll, and billing.</p></div>
        <div className="flex bg-gray-200 p-1 rounded-lg w-full md:w-auto overflow-x-auto snap-x">
          {['calendar', 'schools', 'staff', 'payroll', 'invoicing'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap capitalize ${activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
              {tab === 'schools' ? 'Schools' : tab === 'staff' ? 'Staff' : tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'calendar' && (
        <>
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <MonthNavigation title="Master Calendar" icon={CalendarIcon} />
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {weekDays.map(day => <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr">
              {calendarGrid.map((day, idx) => {
                const dayShifts = day ? currentMonthShifts.filter(s => s.day === day) : [];
                const isToday = day === currentDay && month === new Date().getMonth() && year === new Date().getFullYear();

                return (
                  <div key={idx} className={`min-h-[160px] p-2 md:p-3 border-r border-b border-gray-100 relative group/day ${!day ? 'bg-gray-50/50' : 'bg-white'} ${isToday ? 'bg-teal-50/30' : ''}`}>
                    {day && (
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-teal-600 text-white' : 'text-gray-700'}`}>{day}</span>
                        <button onClick={() => setEditingShift({ id: `new_${Date.now()}`, day: day, startTime: '14:00', endTime: '16:00', duration: 2, schoolId: '', reqLead: 1, reqAssist: 1, assignedLead: [], assignedAssist: [] })} className="opacity-0 group-hover/day:opacity-100 bg-teal-50 text-teal-600 hover:bg-teal-500 hover:text-white p-1 rounded-md transition-all shadow-sm"><Plus className="w-4 h-4" /></button>
                      </div>
                    )}
                    <div className="space-y-2">
                      {dayShifts.map(shift => <ShiftCard key={shift.id} shift={shift} viewType="admin" schools={schools} setEditingShift={setEditingShift} handleUnassign={handleUnassign} setAssignmentModal={setAssignmentModal} getCoachInitials={getCoachInitials} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="md:hidden space-y-6">
            <MonthNavigation title="Monthly Schedule" icon={CalendarIcon} />
            <div className="space-y-4 px-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(dayNum => {
                const dayShifts = currentMonthShifts.filter(s => s.day === dayNum);
                if (dayShifts.length === 0) return null;
                
                const isToday = dayNum === currentDay && month === new Date().getMonth() && year === new Date().getFullYear();

                return (
                  <div key={`mob-day-${dayNum}`} className="space-y-2">
                    <div className="flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-sm py-2 z-10">
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm shadow-sm ${isToday ? 'bg-teal-600 text-white' : 'bg-slate-900 text-white'}`}>
                          {dayNum}
                        </span>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                          {monthNames[month]}
                        </span>
                      </div>
                      <button 
                        onClick={() => setEditingShift({ id: `new_${Date.now()}_${dayNum}`, day: dayNum, startTime: '', endTime: '', duration: 2, schoolId: '', reqLead: 1, reqAssist: 1, assignedLead: [], assignedAssist: [] })}
                        className="bg-white border border-slate-200 text-teal-600 p-1.5 rounded-lg shadow-sm active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3 pl-4 border-l-2 border-slate-200 ml-4">
                      {dayShifts.map(shift => (
                        <ShiftCard 
                          key={`mob-${shift.id}`} 
                          shift={shift} 
                          viewType="admin" 
                          schools={schools} 
                          setEditingShift={setEditingShift} 
                          handleUnassign={handleUnassign} 
                          setAssignmentModal={setAssignmentModal} 
                          getCoachInitials={getCoachInitials} 
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {currentMonthShifts.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-bold text-sm">No sessions scheduled for this month.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'schools' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><School className="w-6 h-6 text-teal-500" />Schools & Venues</h2></div>
            <button onClick={() => { setEditingSchool({ id: `new_sch_${Date.now()}`, name: '', address: '', email: '', leadRate: 90, assistRate: 75, defaultStartTime: '14:30', defaultEndTime: '16:30', sop: null }); }} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 w-full md:w-auto"><Plus className="w-4 h-4" /> Add New School</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schools.map(school => (
              <div key={school.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                <button onClick={() => setEditingSchool(school)} className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-600 hover:bg-teal-50 hover:text-teal-600 rounded-md transition-all border border-gray-200" title="Edit School"><Pencil className="w-4 h-4" /></button>
                <div className="flex items-start gap-4 mb-4 pr-10">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 shrink-0"><School className="w-6 h-6" /></div>
                  <div><h3 className="font-bold text-gray-900 text-lg leading-tight">{school.name}</h3><p className="text-sm text-gray-500 mt-1">{school.address}</p>{school.email && <p className="text-sm text-teal-600 mt-0.5">{school.email}</p>}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100 mb-4">
                  <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Lead Bill Rate</p><p className="font-medium text-gray-900">${school.leadRate}/hr</p></div>
                  <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Assist Bill Rate</p><p className="font-medium text-gray-900">${school.assistRate}/hr</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="w-6 h-6 text-teal-500" />Staff Directory & Compliance</h2></div>
            <button onClick={() => { 
              setEditingCoach({ 
                id: `c${Date.now()}`, 
                name: '', 
                nickname: '', 
                email: '',
                password: 'password123',
                role: 'Coach', 
                tier: 'Junior Coach', 
                assistRate: 25, 
                leadRate: 0, 
                sncsLevel: 'L1', 
                sncsExpiry: '',
                moeExpiry: '',
                faExpiry: '',
                paynow: '',
                telegram: '',
                telegramId: '',
                status: 'Pending',
                mustChangePassword: true,
                certs: {}
              }); 
            }} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 w-full md:w-auto"><Plus className="w-4 h-4" /> Add New Staff</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coaches.filter(c => c.role === 'Coach').map(coach => (
              <div key={coach.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                <button onClick={() => setEditingCoach(coach)} className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-600 hover:bg-teal-50 hover:text-teal-600 rounded-md transition-all border border-gray-200"><Pencil className="w-4 h-4" /></button>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xl shrink-0 border-2 border-white shadow-sm overflow-hidden">
                    {coach.photoURL ? (
                        <img src={coach.photoURL} alt={coach.name} className="w-full h-full object-cover" />
                    ) : (
                        getCoachInitials(coach.id)
                    )}
                  </div>
                  <div className="pr-8"><h3 className="font-bold text-gray-900 text-lg leading-tight">{coach.name}</h3><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{coach.tier}</span></div>
                </div>
                {renderCompliancePills(coach)}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3"><DollarSign className="text-emerald-500 w-6 h-6" /><h2 className="text-lg md:text-xl font-bold text-gray-800">Estimated Payroll</h2></div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-2 mr-2">
                <button 
                  onClick={() => handleExport('monthly')}
                  className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Export Monthly
                </button>
                <button 
                  onClick={() => handleExport('annual')}
                  className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Export Annual
                </button>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
                <button onClick={goToPrevPayrollMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
                <div className="flex items-center gap-1">
                  <select 
                    value={payrollMonth} 
                    onChange={(e) => setPayrollMonth(Number(e.target.value))}
                    className="appearance-none bg-transparent font-bold text-gray-800 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer outline-none text-center min-w-[100px]"
                  >
                    {monthNames.map((name, i) => <option key={name} value={i}>{name}</option>)}
                  </select>
                  <select 
                    value={payrollYear} 
                    onChange={(e) => setPayrollYear(Number(e.target.value))}
                    className="appearance-none bg-transparent font-bold text-gray-800 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer outline-none text-center"
                  >
                    {Array.from({ length: 11 }, (_, i) => (new Date().getFullYear() - 5) + i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <button onClick={goToNextPayrollMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 active:scale-90"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
          <div className="p-4 md:p-6 bg-slate-50 space-y-4">
            {coaches.filter(c => c.role === 'Coach').map(coach => {
              const pay = getCoachPay(coach.id, payrollMonth, payrollYear);
              const eligibility = getCoachEligibility(coach);
              const monthKey = `${payrollYear}-${payrollMonth}`;
              const paymentInfo = coach.paymentStatus?.[monthKey];
              const isPaid = typeof paymentInfo === 'object' ? paymentInfo.status === 'Paid' : paymentInfo === 'Paid';
              const isAcknowledged = typeof paymentInfo === 'object' && paymentInfo.acknowledged;
              
              const breakdown = getCoachPayBreakdown(coach.id, payrollMonth, payrollYear);
              const isExpanded = expandedCoachId === coach.id;
              
              return (
                <div key={coach.id} className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${isPaid ? 'border-emerald-200 bg-emerald-50/10' : 'border-gray-200'}`}>
                  <div className={`p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isExpanded ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg shrink-0 border-2 border-white shadow-sm overflow-hidden">
                          {coach.photoURL ? (
                              <img src={coach.photoURL} alt={coach.name} className="w-full h-full object-cover" />
                          ) : (
                              getCoachInitials(coach.id)
                          )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight">{coach.name}</h3>
                          {isPaid && (
                            <div className="flex items-center gap-1">
                              <span className="flex items-center gap-1 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm"><Check className="w-2 h-2" /> Paid</span>
                              {isAcknowledged && <span className="flex items-center gap-1 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm"><Users className="w-2 h-2" /> Ack</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 mt-1">
                          <span>{coach.tier}</span><span className="hidden sm:inline">•</span>
                          <span className="font-medium text-teal-700">
                            {eligibility.canLead && coach.leadRate > 0 ? `Lead: $${coach.leadRate}/hr` : ''}
                            {eligibility.canLead && coach.leadRate > 0 && eligibility.canAssist && coach.assistRate > 0 ? ' / ' : ''}
                            {eligibility.canAssist && coach.assistRate > 0 ? `Assist: $${coach.assistRate}/hr` : ''}
                            {!eligibility.canLead && !eligibility.canAssist && 'No eligible role'}
                          </span>
                          <span className="hidden sm:inline">•</span><span className="font-mono font-bold text-teal-600">PayNow: {coach.paynow || 'NOT SET'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto border-t sm:border-0 border-gray-100 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right flex-1">
                        <div className="text-3xl font-black text-emerald-600">${pay}</div>
                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mt-1">Expected Pay</div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => setExpandedCoachId(isExpanded ? null : coach.id)}
                          className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                          {isExpanded ? <><ChevronUp className="w-4 h-4" /> Hide</> : <><ChevronDown className="w-4 h-4" /> Breakdown</>}
                        </button>
                        <button 
                          disabled={!isPaid && pay <= 0}
                          onClick={() => {
                            if (isPaid) {
                              setUndoConfirmCoach({ coach, monthKey });
                            } else {
                              const updatedCoach = {
                                ...coach,
                                paymentStatus: {
                                  ...(coach.paymentStatus || {}),
                                  [monthKey]: {
                                    status: 'Paid',
                                    lockedLeadRate: coach.leadRate || 0,
                                    lockedAssistRate: coach.assistRate || 0,
                                    acknowledged: false,
                                    paidAt: new Date().toISOString()
                                  }
                                }
                              };
                              handleSaveCoachEdit(updatedCoach);
                            }
                          }}
                          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95
                            ${(!isPaid && pay <= 0) 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                              : isPaid 
                                ? 'bg-emerald-600 text-white hover:bg-red-600 group relative' 
                                : 'bg-slate-900 text-white hover:bg-emerald-600'}`}
                        >
                          <span className={isPaid ? "group-hover:hidden" : ""}>{isPaid ? 'PAID' : 'Mark Paid'}</span>
                          {isPaid && <span className="hidden group-hover:inline">Undo?</span>}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-50/50 p-4 md:p-6 animate-slide-down">
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Day</th>
                              <th className="px-4 py-3">Time</th>
                              <th className="px-4 py-3">Venue</th>
                              <th className="px-4 py-3">Role</th>
                              <th className="px-4 py-3">Rate</th>
                              <th className="px-4 py-3 text-center">Hrs</th>
                              <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {breakdown.length > 0 ? breakdown.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{item.date}</td>
                                <td className="px-4 py-3 text-gray-500 font-bold uppercase tracking-tighter text-xs">{item.dayOfWeek}</td>
                                <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">{item.time}</td>
                                <td className="px-4 py-3 text-gray-600">{item.schoolName}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.role === 'Lead' ? 'bg-pink-100 text-pink-700' : 'bg-green-100 text-green-700'}`}>
                                    {item.role}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600 font-medium">{item.rate}</td>
                                <td className="px-4 py-3 text-center font-medium text-gray-900">{item.hours}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900">${item.total}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan="8" className="px-4 py-8 text-center text-gray-400 italic">No shifts recorded for this period</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-gray-50/50 border-t border-gray-200">
                            {breakdown.length > 0 && (
                              <tr>
                                <td colSpan="8" className="px-4 py-3 border-b border-gray-100">
                                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-pink-600 bg-pink-50 px-2 py-1 rounded">Lead: {breakdown.filter(i => i.role === 'Lead').length} sessions</span>
                                    <span className="text-green-600 bg-green-50 px-2 py-1 rounded">Assist: {breakdown.filter(i => i.role === 'Assist').length} sessions</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            <tr>
                              <td colSpan="7" className="px-4 py-4 text-right font-bold text-gray-500 uppercase tracking-widest text-[10px]">Subtotal</td>
                              <td className="px-4 py-4 text-right font-black text-lg text-emerald-600">${pay}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'invoicing' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <MonthNavigation title="Client Invoicing" icon={Receipt} />
          <div className="p-4 md:p-6 space-y-4">
            {uniqueActiveSchoolIds.length > 0 ? uniqueActiveSchoolIds.map(schoolId => {
              const school = schools.find(s => s.id === schoolId);
              if (!school) return null;
              
              const schoolShifts = currentMonthShifts.filter(s => s.schoolId === schoolId);
              const invoiceTotal = getSchoolInvoiceTotal(schoolId);
              
              return (
                <div key={schoolId} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xl text-slate-600 border border-slate-200 shrink-0 uppercase"><School className="w-6 h-6 text-slate-400" /></div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-xl">{school.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{schoolShifts.length} shifts logged in {monthNames[month]}</p>
                    </div>
                  </div>
                  
                  {/* --- NEW: INVOICE TOTAL & BUTTON ALIGNMENT --- */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto border-t sm:border-0 border-gray-100 pt-4 sm:pt-0 mt-2 sm:mt-0">
                    <div className="text-left sm:text-right">
                      <div className="text-2xl font-black text-teal-600">${invoiceTotal.toFixed(2)}</div>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Billed</div>
                    </div>
                    <button onClick={() => setInvoiceSchoolId(schoolId)} className="w-full sm:w-auto bg-slate-900 text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 shadow-sm">
                      <FileText className="w-4 h-4" /> View Invoice
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900">No venues to invoice</h3>
                <p className="text-gray-500 mt-1">Add shifts to the calendar for {monthNames[month]} to generate invoices.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Undo Payment Confirmation Modal */}
      {undoConfirmCoach && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-center text-gray-900 mb-2">Reverse Payment Status?</h3>
            <p className="text-center text-gray-500 mb-8 font-medium">
              You are about to undo the 'Paid' status for <span className="font-bold text-gray-900">{undoConfirmCoach.coach.name}</span> for {monthNames[parseInt(undoConfirmCoach.monthKey.split('-')[1])]} {undoConfirmCoach.monthKey.split('-')[0]}. 
              <br/><br/>
              <span className="text-xs text-red-500">Note: This will also unlock the pay rates for this period.</span>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setUndoConfirmCoach(null)}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-100 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const { coach, monthKey } = undoConfirmCoach;
                  const newPaymentStatus = { ...(coach.paymentStatus || {}) };
                  delete newPaymentStatus[monthKey];
                  
                  handleSaveCoachEdit({
                    ...coach,
                    paymentStatus: newPaymentStatus
                  });
                  setUndoConfirmCoach(null);
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                Yes, Reverse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}