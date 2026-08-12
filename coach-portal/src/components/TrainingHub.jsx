import React, { useState, useEffect } from 'react';
import { Search, Info, Dumbbell, Zap, Target, Loader2, ChevronRight, PlayCircle, Baby, UserCircle, Trophy } from 'lucide-react';

const RAPID_API_KEY = '1e4fe151cfmsh33849219f0e1318p1a01a0jsnbf80df6e7c98';
const RAPID_API_HOST = 'exercisedb.p.rapidapi.com';

export default function TrainingHub() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('8-9'); // 8-9, 10-11, 12, climbing
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchExercises = async () => {
    setLoading(true);
    try {
      // Increased limit slightly as we are removing GIFs and want better variety for the new age groups
      let url = 'https://exercisedb.p.rapidapi.com/exercises/equipment/body%20weight?limit=100';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': RAPID_API_HOST
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setExercises(data);
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const filteredExercises = exercises.filter(ex => {
    const name = ex.name.toLowerCase();
    const target = ex.target.toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || 
                          target.includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Filter by Age/Category
    if (filter === '8-9') {
        // Safe, basic movements, focus on play/fundamental core
        return (['abs', 'glutes', 'quads'].includes(target) || name.includes('plank')) && 
               !name.includes('one arm') && !name.includes('inverted') && !name.includes('pull-up');
    }
    if (filter === '10-11') {
        // Intro to lats and forearms, more core stability
        return (['abs', 'lats', 'forearms', 'delts'].includes(target)) && 
               !name.includes('one arm') && !name.includes('handstand push-up');
    }
    if (filter === '12') {
        // Competitive prep: Pulling power, grip, complex bodyweight
        return (['lats', 'forearms', 'delts', 'abs', 'serratus anterior'].includes(target));
    }
    if (filter === 'climbing') {
        return ['forearms', 'lats', 'abs', 'delts'].includes(target);
    }

    return true;
  });

  const getAgeGroupSuggestions = () => {
    const ageMap = {
      '8-9': { title: 'Junior Prep (8-9yo)', desc: 'Fundamental movement & core stability.', icon: <Baby className="w-5 h-5 text-teal-500" /> },
      '10-11': { title: 'Development (10-11yo)', desc: 'Intro to pulling power & grip health.', icon: <UserCircle className="w-5 h-5 text-blue-500" /> },
      '12': { title: 'Competitive (12yo+)', desc: 'Advanced lats, grip & dynamic core.', icon: <Trophy className="w-5 h-5 text-orange-500" /> }
    };
    return ageMap[filter] || ageMap['8-9'];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Search */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Dumbbell className="text-teal-500 w-6 h-6" /> Training Hub
            </h2>
            <p className="text-gray-500 text-sm">Age-appropriate bodyweight & climbing PT suggestions.</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search exercises..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: '8-9', label: 'Age 8-9' },
            { id: '10-11', label: 'Age 10-11' },
            { id: '12', label: 'Age 12+' },
            { id: 'climbing', label: 'Climbing Specific' }
          ].map(f => (
            <button 
              key={f.id}
              onClick={() => { setFilter(f.id); setSelectedExercise(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f.id ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl flex items-center gap-3">
             {getAgeGroupSuggestions().icon}
             <div>
                <h4 className="text-sm font-black text-teal-900">{getAgeGroupSuggestions().title}</h4>
                <p className="text-xs text-teal-700">{getAgeGroupSuggestions().desc}</p>
             </div>
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-bold">Loading exercise library...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredExercises.slice(0, 30).map(ex => (
                <div 
                  key={ex.id} 
                  onClick={() => setSelectedExercise(ex)}
                  className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group hover:border-teal-500 hover:shadow-md ${selectedExercise?.id === ex.id ? 'border-teal-500 ring-2 ring-teal-50' : 'border-gray-100'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 capitalize text-sm mb-1">{ex.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">{ex.target}</span>
                        <span className="text-[10px] font-black bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Bodyweight</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-all ${selectedExercise?.id === ex.id ? 'text-teal-500 translate-x-1' : 'text-gray-300'}`} />
                  </div>
                </div>
              ))}
              {filteredExercises.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    No exercises found matching this criteria.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="space-y-6">
          {selectedExercise ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-4">
               <div className="p-6 bg-slate-900 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-teal-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{selectedExercise.bodyPart}</span>
                    <span className="bg-white/10 text-white/60 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">ID: {selectedExercise.id}</span>
                  </div>
                  <h3 className="text-xl font-black capitalize leading-tight">{selectedExercise.name}</h3>
               </div>
               
               <div className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Target className="w-3 h-3 text-teal-500" /> Focus Muscle
                      </h4>
                      <p className="text-sm font-bold text-slate-700 capitalize bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedExercise.target}</p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-teal-500" /> Coaching Cues
                      </h4>
                      <div className="space-y-3">
                        {selectedExercise.instructions?.map((step, idx) => (
                          <div key={idx} className="flex gap-4 text-xs text-gray-600 leading-relaxed group/cue">
                            <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-black text-[10px] shrink-0 border border-teal-100">{idx + 1}</span>
                            <span className="pt-0.5">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                            Recommended for {filter === '12' ? 'Competitive' : filter === '10-11' ? 'Development' : 'Junior'} level climbing PT.
                        </p>
                    </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                <Dumbbell className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black leading-tight mb-3">Hougang Pri Suggestions</h3>
                <p className="text-teal-100 text-sm mb-8 leading-relaxed">Select an age group to see specific bodyweight movements for your session.</p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-white/10 p-4 rounded-2xl border border-white/5">
                    <Info className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-teal-50 leading-relaxed font-medium">
                        Focus on quality over quantity for younger climbers. 8-9 year olds should focus on basic stability before power.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}