import React from 'react';
import { Calendar as CalendarIcon, User, LogOut } from 'lucide-react';

export default function TopNav({ currentUser, onLogout, setCoachProfileModalOpen }) {
  return (
    <nav className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center relative z-40">
      
      {/* LEFT: Logo / Brand */}
      <div className="flex-1 flex justify-start items-center gap-2">
        <div className="bg-teal-500 p-2 rounded-lg hidden sm:block">
          <CalendarIcon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight hidden sm:block">Rocklab Operations</span>
        <span className="text-xl font-bold tracking-tight sm:hidden">Rocklab</span>
      </div>
      
      {/* CENTER: User Name & Role */}
      <div className="flex-1 flex justify-center items-center">
        <div className="flex items-center gap-2 bg-slate-800 px-3 sm:px-4 py-2 rounded-lg border border-slate-700 shadow-sm">
          <User className="w-4 h-4 text-teal-400 hidden sm:block" />
          <span className="font-medium max-w-[100px] sm:max-w-none truncate">
            {currentUser?.nickname || currentUser?.name?.split(' ')?.[0] || 'User'}
          </span>
          <span className="text-xs bg-slate-600 px-2 py-0.5 rounded text-slate-200 ml-1 hidden md:inline-block">
            {currentUser?.role}
          </span>
        </div>
      </div>

      {/* RIGHT: Text-based Logout Button */}
      <div className="flex-1 flex justify-end items-center">
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 sm:px-4 py-2 rounded-lg transition-colors font-bold text-sm border border-red-500/20 shadow-sm"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

    </nav>
  );
}