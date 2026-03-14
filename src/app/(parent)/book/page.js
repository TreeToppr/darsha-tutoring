'use client';
import { useState } from 'react';
import StepOne from './components/StepOne';
import StepTwo from './components/StepTwo';
import StepThree from './components/StepThree';
import StepFour from './components/StepFour';
import StepFive from './components/StepFive';
import StepSix from './components/StepSix';

export default function BookLessonWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 6; // Adjust based on your final flow

    // This master state holds everything until the final "Confirm & Pay" button
    const [formData, setFormData] = useState({
        studentId: null,
        studentName: '',
        subject: '',
        tutorId: null,
        tutorName: '',
        date: null,
        time: null,
        lessonMode: 'online',
        duration: null, // Add this
        price: null,    // Add this
    });
    const updateFormData = (newData) => {
        setFormData((prev) => ({ ...prev, ...newData }));
    };

    const nextStep = () => setCurrentStep((p) => Math.min(p + 1, totalSteps));
    const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 1));

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header & Progress Bar */}
            <div>
                <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-6">Book a Lesson</h1>

                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step {currentStep} of {totalSteps}</span>
                    <span className="text-xs font-bold text-[#24985b] uppercase tracking-wider">
                        {currentStep === 1 && "Select Student"}
                        {currentStep === 2 && "Select Subject"}
                        {currentStep === 3 && "Choose Tutor"}
                        {currentStep === 4 && "Date & Time"}
                        {currentStep === 5 && "Review & Payment"}
                    </span>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#24985b] transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Step Content Area */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-8">
                {currentStep === 1 && (
                    <StepOne formData={formData} updateFormData={updateFormData} nextStep={nextStep} />
                )}
                {currentStep === 2 && (
                    <StepTwo formData={formData} updateFormData={updateFormData} nextStep={nextStep} prevStep={prevStep} />
                )}
                {currentStep === 3 && (
                    <StepThree formData={formData} updateFormData={updateFormData} nextStep={nextStep} prevStep={prevStep} />
                )}
                {currentStep === 4 && (
                    <StepFour formData={formData} updateFormData={updateFormData} nextStep={nextStep} prevStep={prevStep} />
                )}
                {currentStep === 5 && (
                    <StepFive formData={formData} updateFormData={updateFormData} nextStep={nextStep} prevStep={prevStep} />
                )}
                {currentStep === 6 && (
                    <StepSix formData={formData} updateFormData={updateFormData} nextStep={nextStep} prevStep={prevStep} />
                )}
            </div>
        </div>
    );
}