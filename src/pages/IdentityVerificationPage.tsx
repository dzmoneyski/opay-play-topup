import React from 'react';
import BackButton from '@/components/BackButton';
import { IdentityVerification } from '@/components/IdentityVerification';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function IdentityVerificationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSuccess = () => {
    // Navigate back to dashboard after successful submission
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton />
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">تحقق الهوية</h1>
            <p className="text-white/70">
              قم برفع صور الهوية الوطنية لتفعيل حسابك والوصول لجميع الخدمات
            </p>
          </div>
          
          <IdentityVerification onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}