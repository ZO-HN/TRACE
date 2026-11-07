const MB=1024*1024;
export const MEDIA_POLICY:Record<string,{contentTypes:string[];maxBytes:number}>={
  'form-video':{contentTypes:['video/mp4','video/webm','video/quicktime'],maxBytes:50*MB},
  'meal-photo':{contentTypes:['image/jpeg','image/png','image/webp','image/heic'],maxBytes:10*MB},
  'coach-image':{contentTypes:['image/jpeg','image/png','image/webp'],maxBytes:10*MB},
  'progress-photo':{contentTypes:['image/jpeg','image/png','image/webp','image/heic'],maxBytes:10*MB},
  file:{contentTypes:['application/pdf','image/jpeg','image/png','image/webp'],maxBytes:25*MB},
};
export function mediaPolicy(kind:unknown){return typeof kind==='string'&&Object.prototype.hasOwnProperty.call(MEDIA_POLICY,kind)?MEDIA_POLICY[kind]:undefined;}
