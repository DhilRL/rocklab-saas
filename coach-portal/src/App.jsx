import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Component Imports ---
import TopNav from './components/TopNav';
import AdminDashboard from './components/AdminDashboard';
import CoachDashboard from './components/CoachDashboard';
import AssignmentModal from './components/AssignmentModal';
import EditShiftModal from './components/EditShiftModal';
import EditCoachModal from './components/EditCoachModal';
import EditSchoolModal from './components/EditSchoolModal';
import InvoiceModal from './components/InvoiceModal';
import CoachProfileModal from './components/CoachProfileModal';
import BatchShiftModal from './components/BatchShiftModal';
import EventModal from './components/EventModal';
import LoginPage from './components/LoginPage';

// --- Firebase Imports ---
import { 
  onCoachesSnapshot, onSchoolsSnapshot, onShiftsSnapshot,
  saveCoach, saveSchool, saveShift, saveShiftsBatch,
  deleteCoach, deleteShift, deleteSchool,
  loginWithEmail, logoutUser, onAuthStateChange,
  createAuthUser, getCoaches, seedInitialData
} from './firebase/services';
import { INITIAL_COACHES, INITIAL_SCHOOLS, INITIAL_SHIFTS } from './data/mockData';

export default function App() {
  const [coaches, setCoaches] = useState([]);
  const [schools, setSchools] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const initialTabSetRef = useRef(false);
  
  // --- GLOBAL TIME STATE ---
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const currentDay = today.getDate();

  // --- MODAL STATE ---
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, shiftId: null, roleType: null });
  const [editingShift, setEditingShift] = useState(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
  const [editingSchool, setEditingSchool] = useState(null);
  const [invoiceSchoolId, setInvoiceSchoolId] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [coachProfileModalOpen, setCoachProfileModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleLogin = async (email, password) => { return await loginWithEmail(email, password); };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    initialTabSetRef.current = false;
  };

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    setCoaches(prev => prev.map(c => c.id === updatedUser.id ? updatedUser : c));
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthChecking(false);
        setIsLoading(true);
        
        const checkAndSeed = async () => {
          try {
            const existingCoaches = await getCoaches();
            if (existingCoaches.length === 0) await seedInitialData(INITIAL_COACHES, INITIAL_SCHOOLS, INITIAL_SHIFTS);
          } catch (err) { console.error('Seed check error:', err); }
        };
        await checkAndSeed();
        
        const unsubscribeCoaches = onCoachesSnapshot((coachesData) => {
          setCoaches(coachesData);
          const matchedCoach = coachesData.find(c => c.email === firebaseUser.email);
          if (matchedCoach) {
            setCurrentUser(matchedCoach);
            
            // Check for forced password change
            if (matchedCoach.mustChangePassword && !initialTabSetRef.current) {
              setCoachProfileModalOpen(true);
            }

            // ONLY set the initial tab once. Don't switch tabs on subsequent background syncs.
            if (!initialTabSetRef.current) {
              if (matchedCoach.role === 'Coach') setActiveTab('dashboard');
              else setActiveTab('calendar');
              initialTabSetRef.current = true;
            }
          }
        });
        
        const unsubscribeSchools = onSchoolsSnapshot((schoolsData) => setSchools(schoolsData));
        const unsubscribeShifts = onShiftsSnapshot((shiftsData) => {
          setShifts(shiftsData);
          setIsLoading(false);
        });
        
        window.__unsubscribes = [unsubscribeCoaches, unsubscribeSchools, unsubscribeShifts];
      } else {
        setCurrentUser(null); setCoaches([]); setSchools([]); setShifts([]);
        setIsAuthChecking(false); setIsLoading(false); initialTabSetRef.current = false;
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (window.__unsubscribes) window.__unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const calendarGrid = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDayOfMonth = new Date(year, month, 1).getDay();
    firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month]);

  const getCoachInitials = (coachId) => {
    if (!coachId) return '??';
    const coach = coaches.find(c => c.id === coachId);
    if (!coach) return '??';
    const nameToUse = coach.nickname || coach.name;
    return nameToUse.substring(0, 2).toUpperCase();
  };

  // --- OPTIMISTIC DATA MUTATION HANDLERS ---
  const handleAssign = async (coachId) => {
    const shiftToUpdate = shifts.find(s => s.id === assignmentModal.shiftId);
    if (!shiftToUpdate) return;

    // Check if coach is already assigned to the other role
    const otherRole = assignmentModal.roleType === 'Lead' ? 'assignedAssist' : 'assignedLead';
    if (shiftToUpdate[otherRole]?.includes(coachId)) {
      alert("This coach is already assigned to another role for this shift.");
      return;
    }

    const targetArray = assignmentModal.roleType === 'Lead' ? 'assignedLead' : 'assignedAssist';
    const updatedShift = { 
      ...shiftToUpdate, 
      [targetArray]: [...(shiftToUpdate[targetArray] || []), coachId] 
    };

    setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
    setAssignmentModal({ isOpen: false, shiftId: null, roleType: null });
    
    try { 
      await saveShift(updatedShift); 
    } catch(e) { 
      console.error("Firebase save error:", e); 
    }
  };

  const handleUnassign = async (shiftId, coachId, roleType) => {
    const updatedShifts = shifts.map(shift => {
      if (shift.id === shiftId) {
        const targetArray = roleType === 'Lead' ? 'assignedLead' : 'assignedAssist';
        return { ...shift, [targetArray]: shift[targetArray].filter(id => id !== coachId) };
      }
      return shift;
    });

    setShifts(updatedShifts);
    
    const updatedShift = updatedShifts.find(s => s.id === shiftId);
    if (updatedShift) {
      try { await saveShift(updatedShift); } catch(e) { console.error(e); }
    }
  };

  // --- SAVE & DELETE LOGIC ---
  const handleSaveShiftEdit = async (updatedShift) => { 
    const isNew = !shifts.find(s => s.id === updatedShift.id);
    
    // Clean ID for Firestore (remove 'new_' prefix if it exists)
    const cleanId = updatedShift.id.toString().startsWith('new_') 
      ? updatedShift.id.toString().replace('new_', 's') 
      : updatedShift.id;
    
    const finalShift = { ...updatedShift, id: cleanId };

    setShifts(prev => isNew 
      ? [...prev.filter(s => s.id !== updatedShift.id), finalShift] 
      : prev.map(s => s.id === updatedShift.id ? finalShift : s)
    );
    
    setEditingShift(null);
    try { await saveShift(finalShift); } catch (e) { console.error("Firebase save error:", e); }
  };

  const handleSaveBatchShifts = async (newShifts) => {
    // Clean IDs for batch
    const finalizedShifts = newShifts.map(s => ({
      ...s,
      id: s.id.toString().replace('batch_', 's')
    }));

    setShifts(prev => [...prev, ...finalizedShifts]);
    try {
      await saveShiftsBatch(finalizedShifts);
      alert(`Successfully created ${finalizedShifts.length} shifts!`);
    } catch (e) {
      console.error("Batch save error:", e);
      alert("Failed to save shifts. Please try again.");
    }
  };

  const handleSaveEvent = async (eventData) => {
    const isUpdate = shifts.find(s => s.id === eventData.id);
    setShifts(prev => isUpdate ? prev.map(s => s.id === eventData.id ? eventData : s) : [...prev, eventData]);
    try {
      await saveShift(eventData);
    } catch (e) {
      console.error("Event save error:", e);
      alert("Failed to save event.");
    }
  };

  const handleDeleteShift = async (shiftId) => {
    try { 
      setShifts(prev => prev.filter(s => s.id !== shiftId));
      setEditingShift(null);
      await deleteShift(shiftId); 
    } catch (e) { 
      console.error("Firebase delete error:", e); 
      alert("Error deleting shift: " + e.message);
    }
  };

  const handleSaveCoachEdit = async (updatedCoach) => { 
    const isNew = !coaches.find(c => c.id === updatedCoach.id);
    setCoaches(prev => isNew ? [...prev, updatedCoach] : prev.map(c => c.id === updatedCoach.id ? updatedCoach : c));
    if (currentUser?.id === updatedCoach.id) setCurrentUser(updatedCoach);
    setEditingCoach(null); 
    
    try { 
      await saveCoach(updatedCoach); 
      
      // If it's a new coach, create their Auth account too
      if (isNew && updatedCoach.email && updatedCoach.password) {
        await createAuthUser(updatedCoach.email, updatedCoach.password);
        alert(`Account created for ${updatedCoach.name}! They can now log in with ${updatedCoach.email}`);
      }
    } catch (e) { 
      console.error("Firebase save error:", e); 
      alert("Error saving coach: " + e.message);
    }
  };

  const handleDeleteCoach = async (coachId) => {
    setCoaches(prev => prev.filter(c => c.id !== coachId));
    setEditingCoach(null);
    try { await deleteCoach(coachId); } catch (e) { console.error("Firebase delete error:", e); }
  };

  const handleSaveSchoolEdit = async (updatedSchool) => { 
    const isNew = !schools.find(s => s.id === updatedSchool.id);
    setSchools(prev => isNew ? [...prev, updatedSchool] : prev.map(s => s.id === updatedSchool.id ? updatedSchool : s));
    setEditingSchool(null); 
    try { await saveSchool(updatedSchool); } catch (e) { console.error("Firebase save error:", e); }
  };

  const handleDeleteSchool = async (schoolId) => {
    if (shifts.some(s => s.schoolId === schoolId)) {
      alert("Cannot delete this school because it has shifts assigned to it. Please delete the shifts first.");
      return;
    }
    
    setSchools(prev => prev.filter(s => s.id !== schoolId));
    setEditingSchool(null);
    try { await deleteSchool(schoolId); } catch (e) { console.error("Firebase delete error:", e); }
  };

  // --- RENDERING ---
  if (!isAuthChecking && !currentUser) return <LoginPage onLogin={handleLogin} isLoading={isLoading} />;
  if (isAuthChecking || isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div><p className="text-gray-600">Loading dashboard...</p></div>;

  return (
    <div className={`min-h-screen bg-slate-50 font-sans selection:bg-teal-200 relative pb-10 ${invoiceSchoolId ? 'print:bg-white' : ''}`}>
      <div className={invoiceSchoolId ? 'print:hidden' : ''}>
        
        <TopNav currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} setCoachProfileModalOpen={setCoachProfileModalOpen} />

        {currentUser?.role === 'Admin' ? (
          <AdminDashboard 
            activeTab={activeTab} setActiveTab={setActiveTab} shifts={shifts} coaches={coaches} schools={schools} 
            calendarGrid={calendarGrid} currentDay={currentDay} weekDays={weekDays} monthNames={monthNames} 
            month={month} year={year} setMonth={setMonth} setYear={setYear}
            setEditingShift={setEditingShift} setEditingSchool={setEditingSchool} setEditingCoach={setEditingCoach} 
            setAssignmentModal={setAssignmentModal} setInvoiceSchoolId={setInvoiceSchoolId}
            handleUnassign={handleUnassign} openBatchModal={() => setBatchModalOpen(true)}
            openEventModal={() => setIsEventModalOpen(true)}
            handleSaveCoachEdit={handleSaveCoachEdit}
          />
        ) : (
          <CoachDashboard 
            currentUser={currentUser} shifts={shifts} schools={schools} monthNames={monthNames} 
            month={month} year={year} setMonth={setMonth} setYear={setYear}
            activeTab={activeTab} setActiveTab={setActiveTab} onUpdateUser={handleUpdateUser}
          />
        )}

        <AssignmentModal assignmentModal={assignmentModal} setAssignmentModal={setAssignmentModal} coaches={coaches} handleAssign={handleAssign} />
        
        <EditShiftModal 
          editingShift={editingShift && editingShift.type !== 'event' ? editingShift : null} 
          setEditingShift={setEditingShift} schools={schools} coaches={coaches} shifts={shifts}
          handleSaveShiftEdit={handleSaveShiftEdit} handleDeleteShift={handleDeleteShift} 
          month={month} year={year} 
        />

        <BatchShiftModal 
          isOpen={batchModalOpen} onClose={() => setBatchModalOpen(false)} schools={schools} coaches={coaches}
          onSave={handleSaveBatchShifts} month={month} year={year} monthNames={monthNames} 
        />

        <EventModal 
          isOpen={isEventModalOpen || (editingShift && editingShift.type === 'event')} 
          onClose={() => { setIsEventModalOpen(false); setEditingShift(null); }} 
          coaches={coaches}
          schools={schools}
          onSave={handleSaveEvent} 
          onDelete={handleDeleteShift}
          editingEvent={editingShift && editingShift.type === 'event' ? editingShift : null}
          month={month} year={year} 
        />
        
        <EditCoachModal 
          key={editingCoach?.id || 'new-coach'}
          editingCoach={editingCoach} setEditingCoach={setEditingCoach} 
          handleSaveCoachEdit={handleSaveCoachEdit} handleDeleteCoach={handleDeleteCoach}
          isNewCoach={editingCoach && !coaches.find(c => c.id === editingCoach.id)}
        />
        
        <EditSchoolModal editingSchool={editingSchool} setEditingSchool={setEditingSchool} handleSaveSchoolEdit={handleSaveSchoolEdit} handleDeleteSchool={handleDeleteSchool} schools={schools} />
        <CoachProfileModal isOpen={coachProfileModalOpen} setIsOpen={setCoachProfileModalOpen} currentUser={currentUser} handleSaveCoachEdit={handleSaveCoachEdit} />

      </div>
      
      <InvoiceModal 
        invoiceSchoolId={invoiceSchoolId} 
        setInvoiceSchoolId={setInvoiceSchoolId} 
        shifts={shifts} 
        schools={schools} 
        coaches={coaches}
        monthNames={monthNames} 
        month={month} 
        year={year} 
        isDownloading={isDownloading} 
        setIsDownloading={setIsDownloading} 
      />
      
    </div>
  );
}