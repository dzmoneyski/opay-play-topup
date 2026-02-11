import React from 'react';
import { Shield, Clock, Phone } from 'lucide-react';
import opayLogo from '@/assets/opay-final-logo.png';

const MaintenanceMode = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={opayLogo} alt="OPay Logo" className="h-16 object-contain" />
        </div>

        {/* Shield Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
            <Shield className="w-12 h-12 text-amber-400" />
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">
            الموقع تحت الصيانة
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            نعتذر منكم، نقوم حالياً بإجراء تحديثات أمنية مهمة لحماية حساباتكم وبياناتكم.
          </p>
          <p className="text-slate-400">
            سيعود الموقع للعمل في أقرب وقت ممكن إن شاء الله.
          </p>
        </div>

        {/* Status */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-center gap-3 text-amber-400">
            <Clock className="w-5 h-5" />
            <span className="font-medium">جاري العمل على إصلاح المشكلة</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-amber-500 to-green-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>

        {/* Contact */}
        <div className="text-slate-400 text-sm space-y-2">
          <p>أموالكم وبياناتكم في أمان تام 🔒</p>
          <p>للتواصل معنا في حالة الطوارئ:</p>
          <a 
            href="https://t.me/opay_support" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Phone className="w-4 h-4" />
            تواصل معنا عبر تيليغرام
          </a>
        </div>

        <p className="text-xs text-slate-500">
          نشكركم على صبركم وتفهمكم ❤️
        </p>
      </div>
    </div>
  );
};

export default MaintenanceMode;
