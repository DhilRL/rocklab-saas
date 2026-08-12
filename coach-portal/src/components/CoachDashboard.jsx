import React, { useState } from 'react';
import { Calendar as CalendarIcon, DollarSign, Clock, Download, AlertCircle, School, BookOpen, ArrowLeft, Users, Ban, ShieldCheck, ChevronLeft, ChevronRight, X, Printer, FileText, Dumbbell, Check } from 'lucide-react';
import ShiftCard from './ShiftCard';
import CoachCertifications from './CoachCertifications';
import CoachProfileModal from './CoachProfileModal';
import TrainingHub from './TrainingHub';

export default function CoachDashboard({ 
  currentUser, shifts, schools, monthNames, month, year, setMonth, setYear,
  activeTab, setActiveTab, onUpdateUser 
}) {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileViewMode, setProfileViewMode] = useState('full');
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  
  const currentMonthShifts = shifts.filter(s => {
    const shiftMonth = s.month !== undefined ? s.month : new Date().getMonth();
    const shiftYear = s.year !== undefined ? s.year : new Date().getFullYear();
    return shiftMonth === month && shiftYear === year;
  });

  const myShifts = currentMonthShifts.filter(s => s.assignedLead?.includes(currentUser.id) || s.assignedAssist?.includes(currentUser.id)).sort((a, b) => a.day - b.day);
  
  const monthKey = `${year}-${month}`;
  const paymentInfo = currentUser.paymentStatus?.[monthKey];
  const isPaid = typeof paymentInfo === 'object' ? paymentInfo.status === 'Paid' : paymentInfo === 'Paid';
  const isAcknowledged = typeof paymentInfo === 'object' && paymentInfo.acknowledged;
  
  const lockedLeadRate = (typeof paymentInfo === 'object' && paymentInfo.lockedLeadRate !== undefined) ? paymentInfo.lockedLeadRate : null;
  const lockedAssistRate = (typeof paymentInfo === 'object' && paymentInfo.lockedAssistRate !== undefined) ? paymentInfo.lockedAssistRate : null;

  let expectedPay = 0;
  myShifts.forEach(shift => {
    const payrollHours = shift.type === 'event' ? (shift.coachPaidHours !== undefined ? shift.coachPaidHours : shift.duration) : shift.duration;
    const isLead = shift.assignedLead?.includes(currentUser.id);
    const isAssist = shift.assignedAssist?.includes(currentUser.id);

    if (isLead) {
      const rate = shift.type === 'event' ? (shift.coachLeadPayRate || 0) : (lockedLeadRate !== null ? lockedLeadRate : (currentUser.leadRate || 0));
      expectedPay += (payrollHours * rate);
    }
    if (isAssist) {
      const rate = shift.type === 'event' ? (shift.coachAssistPayRate || 0) : (lockedAssistRate !== null ? lockedAssistRate : (currentUser.assistRate || 0));
      expectedPay += (payrollHours * rate);
    }
  });

  const isMissingCompulsory = !currentUser.certs?.sncs || !currentUser.certs?.moe;

  const mySchools = [...new Set(myShifts.map(s => s.schoolId))]
    .map(id => schools.find(s => s.id === id))
    .filter(s => s && s.sop);

  const goToPrevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else { setMonth(month - 1); } };
  const goToNextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else { setMonth(month + 1); } };

  // Generate payslip data
  const payslipBreakdown = myShifts.map(s => {
    const isLead = s.assignedLead?.includes(currentUser.id);
    let rate = 0;
    if (s.type === 'event') {
      rate = isLead ? (s.coachLeadPayRate || 0) : (s.coachAssistPayRate || 0);
    } else {
      if (isLead) {
        rate = lockedLeadRate !== null ? lockedLeadRate : (currentUser.leadRate || 0);
      } else {
        rate = lockedAssistRate !== null ? lockedAssistRate : (currentUser.assistRate || 0);
      }
    }

    const school = schools.find(sch => sch.id === s.schoolId);
    const dateObj = new Date(year, month, s.day);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    
    const payrollHours = s.type === 'event' ? (s.coachPaidHours !== undefined ? s.coachPaidHours : s.duration) : s.duration;

    return {
      date: `${s.day}/${month + 1}/${year}`,
      day: dayOfWeek,
      time: s.time || 'N/A',
      venue: s.type === 'event' ? (s.name || school?.name || 'Event') : (school?.name || 'Unknown'),
      role: isLead ? 'Lead' : 'Assist',
      rate: rate,
      hours: payrollHours,
      total: payrollHours * rate
    };
  });

  // Simple update handler that just passes the data up - no navigation
  const handleUpdateUser = (updatedUser) => {
    onUpdateUser(updatedUser);
  };

  // Show certifications tab if active
  if (activeTab === 'certifications') {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <CoachCertifications 
          currentUser={currentUser} 
          onUpdate={handleUpdateUser}
          viewMode={profileViewMode}
        />
      </div>
    );
  }

  if (activeTab === 'training') {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto animate-fade-in">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <TrainingHub />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center font-bold text-2xl text-slate-600 border-4 border-white shadow-md overflow-hidden shrink-0">
                {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black uppercase tracking-tighter">{(currentUser.nickname || currentUser.name || '??').substring(0, 2).toUpperCase()}</span>
                    </div>
                )}
            </div>
            <div>
                <h1 className="text-2xl font-black text-gray-900 leading-tight">Welcome back, {currentUser.name?.split(' ')?.[0] || currentUser.name}!</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-widest border border-slate-200">{currentUser.tier}</span>
                    {currentUser.status === 'Active' ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-widest"><ShieldCheck className="w-3 h-3" /> Verified</span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase tracking-widest"><AlertCircle className="w-3 h-3" /> Vetting Pending</span>
                    )}
                </div>
            </div>
        </div>
        <button 
            onClick={() => { setProfileViewMode('full'); setActiveTab('certifications'); }}
            className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-teal-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 tracking-widest uppercase"
        >
            <Users className="w-4 h-4" /> Edit Profile & Payment
        </button>
      </div>

      {currentUser.rejectionReason && currentUser.status === 'Pending' && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl animate-fade-in shadow-sm">
          <div className="flex items-start gap-3">
            <Ban className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-800">Profile Review Feedback</h3>
              <p className="text-sm text-red-700 mt-1 font-medium">
                Your profile needs some adjustments: <span className="italic">"{currentUser.rejectionReason}"</span>
              </p>
              <button 
                onClick={() => { setProfileViewMode('full'); setActiveTab('certifications'); }}
                className="mt-3 text-xs font-black bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all uppercase tracking-wider shadow-sm"
              >
                Update My Docs Now
              </button>
            </div>
          </div>
        </div>
      )}

      {isMissingCompulsory && !currentUser.rejectionReason && (
        <div 
          onClick={() => { setProfileViewMode('certs'); setActiveTab('certifications'); }}
          className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Action Required: Missing Certifications</h3>
            <p className="text-sm text-red-700 mt-1">
              You are missing compulsory files. <span className="font-bold underline">Click here</span> to go to the My Certs tab and upload your SNCS and MOE documents.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-16 h-16" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-100 mb-2">
              <DollarSign className="w-5 h-5" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Estimated Pay</h3>
            </div>
            <div className="text-5xl font-black tracking-tight">${expectedPay}</div>
            
            {isPaid && !isAcknowledged && (
              <button 
                onClick={() => {
                  const updatedUser = {
                    ...currentUser,
                    paymentStatus: {
                      ...(currentUser.paymentStatus || {}),
                      [monthKey]: {
                        ...(typeof paymentInfo === 'object' ? paymentInfo : { status: 'Paid' }),
                        acknowledged: true,
                        acknowledgedAt: new Date().toISOString()
                      }
                    }
                  };
                  onUpdateUser(updatedUser);
                }}
                className="mt-4 w-full bg-white text-emerald-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 hover:bg-emerald-50"
              >
                <Check className="w-4 h-4" /> Acknowledge Payment
              </button>
            )}

            {isAcknowledged && (
              <div className="mt-4 flex items-center justify-center gap-2 bg-emerald-400/20 py-2 rounded-xl border border-emerald-400/30">
                <ShieldCheck className="w-4 h-4 text-emerald-100" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-50">Payment Acknowledged</span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-emerald-400/30 flex flex-col gap-3">
              <div className="flex justify-between text-sm text-emerald-50">
                <span>Your Rates:</span>
                <span className="font-bold">
                  {lockedLeadRate !== null || lockedAssistRate !== null 
                    ? `L: $${lockedLeadRate ?? currentUser.leadRate} / A: $${lockedAssistRate ?? currentUser.assistRate} (Locked)`
                    : currentUser.tier === 'Senior Coach' ? `L: $${currentUser.leadRate} / A: $${currentUser.assistRate}` : `$${currentUser.assistRate}/hr`}
                </span>
              </div>
              <button 
                onClick={() => setIsPayslipOpen(true)}
                className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/20 active:scale-95"
              >
                <FileText className="w-4 h-4" /> View Payslip
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CalendarIcon className="w-5 h-5" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Shifts This Month</h3>
          </div>
          <div className="text-4xl font-black text-gray-800">{myShifts.length}</div>
        </div>
        
        <div 
          onClick={() => setActiveTab('training')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-center cursor-pointer hover:bg-teal-50 hover:border-teal-200 transition-all group"
        >
          <div className="flex items-center gap-2 text-gray-500 mb-2 group-hover:text-teal-600 transition-colors">
            <Dumbbell className="w-5 h-5" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Training Hub</h3>
          </div>
          <div className="text-sm text-slate-600 font-medium">
            Browse exercise suggestions & PT drills
          </div>
          <p className="text-xs text-teal-600 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Explore Hub →</p>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-8 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
        <button onClick={goToPrevMonth} className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-600 active:scale-90"><ChevronLeft className="w-6 h-6" /></button>
        <div className="text-center">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Viewing Period</span>
            <div className="flex items-center gap-1 justify-center">
                <select 
                    value={month} 
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="appearance-none bg-transparent font-black text-slate-800 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer outline-none text-center min-w-[120px] text-xl"
                >
                    {monthNames.map((name, i) => <option key={name} value={i}>{name}</option>)}
                </select>
                <select 
                    value={year} 
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="appearance-none bg-transparent font-black text-slate-800 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer outline-none text-center text-xl"
                >
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
        <button onClick={goToNextMonth} className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-600 active:scale-90"><ChevronRight className="w-6 h-6" /></button>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-teal-500" />
        {month === new Date().getMonth() && year === new Date().getFullYear() ? 'My Upcoming Shifts' : `Shifts for ${monthNames[month]}`}
      </h2>
      
      {myShifts.length > 0 ? (
        <div className="space-y-4 mb-10">
          {myShifts.map(shift => (
            <ShiftCard 
              key={shift.id} 
              shift={shift} 
              viewType="coach"
              schools={schools}
              currentUser={currentUser}
              monthNames={monthNames}
              month={month}
              year={year}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 mb-10">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No shifts assigned yet</h3>
          <p className="text-gray-500 mt-1">Check back later or contact your administrator.</p>
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 border-t border-gray-200 pt-8">
        <School className="w-5 h-5 text-teal-500" />
        Partner School Resources
      </h2>
      {mySchools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mySchools.map(school => (
            <div key={school.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
              <div className="p-2 bg-teal-50 rounded-lg text-teal-600 shrink-0"><BookOpen className="w-5 h-5" /></div>
              <div>
                <h4 className="font-bold text-gray-900">{school.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">{school.address}</p>
                <button className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                  <Download className="w-4 h-4" /> Download SOP PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-200">
          You do not have any shifts scheduled at schools with active SOP documents.
        </div>
      )}
      <CoachProfileModal 
        isOpen={profileModalOpen} 
        setIsOpen={setProfileModalOpen} 
        currentUser={currentUser} 
        handleSaveCoachEdit={handleUpdateUser} 
      />

      {/* Payslip Modal */}
      {isPayslipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-teal-600" />
                <div>
                  <h2 className="text-xl font-black text-gray-900 leading-tight">Monthly Payslip</h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{monthNames[month]} {year}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button onClick={() => setIsPayslipOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><X className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8" id="printable-payslip">
              <div className="print:block">
                <div className="flex justify-between items-start mb-10 pb-10 border-b-2 border-slate-100">
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">ROCKLAB1</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Coaching Portal • Monthly Statement</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Statement For</div>
                    <div className="text-xl font-black text-slate-800">{currentUser.name}</div>
                    <div className="text-sm font-bold text-teal-600 mt-1">{monthNames[month]} {year}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10 mb-10">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Coach Details</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between border-b border-slate-50 pb-1.5">
                        <span className="text-xs font-bold text-slate-500">Tier:</span>
                        <span className="text-xs font-black text-slate-800">{currentUser.tier}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 pb-1.5">
                        <span className="text-xs font-bold text-slate-500">PayNow Number:</span>
                        <span className="text-xs font-black text-slate-800">{currentUser.paynow || 'Not Provided'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-xl">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payout</h3>
                    <div className="text-4xl font-black tracking-tighter text-emerald-400">${expectedPay}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[9px]">
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4">Day</th>
                        <th className="px-4 py-4">Time</th>
                        <th className="px-4 py-4">Venue</th>
                        <th className="px-4 py-4">Role</th>
                        <th className="px-4 py-4 text-center">Rate</th>
                        <th className="px-4 py-4 text-center">Hrs</th>
                        <th className="px-4 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payslipBreakdown.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-black text-slate-800 whitespace-nowrap">{item.date}</td>
                          <td className="px-4 py-3 font-bold text-slate-400 uppercase tracking-tighter">{item.day}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono">{item.time}</td>
                          <td className="px-4 py-3 text-slate-600 font-bold">{item.venue}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${item.role === 'Lead' ? 'bg-pink-100 text-pink-700' : 'bg-green-100 text-green-700'}`}>
                              {item.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.rate}</td>                          <td className="px-4 py-3 text-center font-black text-slate-800">{item.hours}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">${item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      {payslipBreakdown.length > 0 && (
                        <tr>
                          <td colSpan="8" className="px-4 py-3 border-b border-gray-100">
                            <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
                              <span className="text-pink-600 bg-pink-50 px-2 py-1 rounded">Lead: {payslipBreakdown.filter(i => i.role === 'Lead').length} sessions</span>
                              <span className="text-green-600 bg-green-50 px-2 py-1 rounded">Assist: {payslipBreakdown.filter(i => i.role === 'Assist').length} sessions</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan="7" className="px-4 py-4 text-right font-black text-slate-400 uppercase tracking-widest text-[9px]">Grand Total Payout</td>
                        <td className="px-4 py-4 text-right font-black text-lg text-teal-600">${expectedPay}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-10 pt-10 border-t border-slate-100 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">This is a system generated statement • No signature required</p>
                  <p className="text-[10px] font-black text-teal-600 mt-1">Generated via ROCKLAB1 Coaching Portal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}