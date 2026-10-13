import assert from 'node:assert/strict';
import { test } from 'node:test';
import { message } from '../localization.ts';

test('reported Quran library and download labels no longer fall back to English',()=>{
  for(const language of ['fr','ur','id','tr'] as const){
    for(const english of ['My Quran library','Manage downloads','Downloads','Book name','Partial download','Retry download']){
      const translated=message(language,english);
      assert.ok(translated.trim());
      assert.notEqual(translated,english,language+': '+english);
    }
  }
});
