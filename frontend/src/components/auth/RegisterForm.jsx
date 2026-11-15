import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from '../ui';

const COURSE_OPTIONS = [
  'BSA - Bachelor of Science in Accountancy',
  'BSCS - Bachelor of Science in Computer Science',
  'BSIT - Bachelor of Science in Information Technology',
  'BSCE - Bachelor of Science in Civil Engineering',
  'BSN - Bachelor of Science in Nursing',
  'BSCRIM - Bachelor of Science in Criminology',
];

export function RegisterForm({ onSwitchToLogin, onSuccess }) {
  const { register, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [course, setCourse] = useState('BSA - Bachelor of Science in Accountancy');
  const [yearLevel, setYearLevel] = useState('1st Year');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (!email.trim().toLowerCase().endsWith('.edu.ph')) {
      setLocalError('Institutional email required: Must end with .edu.ph');
      return;
    }

    if (!school.trim()) {
      setLocalError('School / University is required');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    const result = await register(email.trim(), password, name.trim(), school.trim(), course, yearLevel);
    setIsLoading(false);
    
    if (result.success && onSuccess) {
      onSuccess();
    }
  };

  const displayError = localError || error;

  return (
    <Card className="w-full max-w-md p-6">
      <h2 className="text-2xl font-bold text-center mb-1 text-gray-900 dark:text-white">
        Student Registration
      </h2>
      <p className="text-xs text-center text-gray-500 mb-6">
        Verified institutional Philippine students only (.edu.ph)
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Dela Cruz"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Institutional Email (.edu.ph)
          </label>
          <Input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@urios.edu.ph"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="reg-school" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            School / University
          </label>
          <Input
            id="reg-school"
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="Father Saturnino Urios University"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Degree Program / Course
          </label>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
          >
            {COURSE_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Standing Year Level
          </label>
          <select
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
          >
            {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="reg-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <Input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Confirm Password
          </label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
          />
        </div>

        {displayError && (
          <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
            {displayError}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2"
        >
          {isLoading ? 'Creating student account...' : 'Create Student Account'}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
        Already registered?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Sign In
        </button>
      </p>
    </Card>
  );
}

export default RegisterForm;