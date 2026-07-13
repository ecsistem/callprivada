package models

import "time"

type AppSetting struct {
	Key       string `gorm:"column:key;primaryKey"`
	Value     string `gorm:"column:value;not null;default:''"`
	UpdatedAt time.Time
}

func (AppSetting) TableName() string { return "app_settings" }
