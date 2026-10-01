export interface LessonPlanInput {
  teacherName: string;
  subject: string;
  grade: string;
  periods: number;
}

export interface FileWithPreview extends File {
  preview: string;
}

export interface Activity {
  activityName: string;
  objective: string;
  teacherActivity: string;
  studentActivity: string;
}

export interface LessonPlan {
  subject: string;
  grade: string;
  lessonTitle: string;
  periods: number;
  executionTime: string;
  requiredOutcomes: {
    generalCompetencies: string;
    specificCompetencies: string;
    qualities: string;
    integratedContent: string;
  };
  teachingAids: {
    teacher: string;
    student: string;
  };
  teachingActivities: Activity[];
  postLessonAdjustments: string;
}