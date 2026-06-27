# Robotics On Phone

Version: 1.0

---

# Vision

Robotics On Phone is a complete mobile-first Arduino programming environment.

The goal is to make it possible to build, program, compile, upload, debug and manage Arduino projects entirely from an Android phone without requiring a laptop.

This application should become the mobile equivalent of PictoBlox for Arduino programming while providing a significantly better mobile experience.

---

# Core Principles

These rules are absolute.

Never violate them.

1. Mobile First
   Everything must be designed for phones before tablets or desktop.

2. No Laptop Required
   A beginner should be able to finish an Arduino project using only a phone.

3. Beginner Friendly
   Every workflow should require the fewest possible steps.

4. Professional Quality
   UI/UX should feel comparable to Figma, Notion, Linear and modern Google applications.

5. High Performance
   Smooth animations.
   Fast rendering.
   Low memory usage.

6. Offline First
   Projects work without Internet.
   Internet is only needed when absolutely required.

---

# Main Features

The application shall include:

• Project Manager

• Blockly Editor

• Arduino Code Generator

• USB Upload

• Serial Monitor

• Library Manager

• Board Manager

• Example Projects

• Tutorials

• Project Templates

• File Explorer

• Code Viewer

• OTA support (future)

• ESP32 support

• Arduino UNO

• Arduino Nano

• Mega

• Leonardo

• ESP8266

• Raspberry Pi Pico

---

# Blockly

The Blockly experience should match PictoBlox.

Implement every useful block category including:

Motion

Looks

Sound

Events

Control

Sensing

Operators

Variables

Lists

Functions

Arduino

Digital IO

Analog IO

PWM

Servo

DC Motor

Stepper

Ultrasonic

IR

RFID

LCD

OLED

NeoPixel

Bluetooth

WiFi

ESP32

DHT

BMP280

MPU6050

Joystick

Relay

Buzzer

Button

Touch

RTC

SD Card

I2C

SPI

UART

Interrupts

Timer

Cloud

MQTT

HTTP

Firebase

AI

Camera

Machine Learning

Speech Recognition

Speech Synthesis

Image Classification

Object Detection

Face Detection

Face Recognition

Custom Blocks

Extensions

Every block should generate valid Arduino C++.

---

# UI/UX

Target:

Better than PictoBlox.

Inspired by:

Google Material 3

Linear

Figma

Notion

Cursor

Android Studio

Visual Studio Code

The interface should feel modern.

---

# Pages

Splash

Home

Projects

Recent

Templates

Editor

Blockly

Generated Code

Upload

Board Manager

Device Manager

Library Manager

Settings

Help

Documentation

Examples

Account (future)

Cloud Sync (future)

---

# Editor

Support:

Undo

Redo

Copy

Paste

Duplicate

Zoom

Mini Map

Search

Replace

Comments

Collapse Blocks

Expand Blocks

Multiple Selection

Snap

Alignment

Keyboard Shortcuts

Touch Gestures

---

# Upload

Support

USB OTG

Serial Monitor

Auto Detect Port

Board Detection

Progress

Logs

Reconnect

Retry

Flash

Compile

Verify

Upload

---

# Project System

Create

Rename

Duplicate

Delete

Folders

Tags

Search

Sort

Recent

Favorites

Export

Import

Backup

Restore

---

# Code Generator

Generate clean Arduino C++.

Support:

setup()

loop()

Functions

Libraries

Classes

Global Variables

Constants

Comments

Formatting

---

# Examples

Provide dozens of ready-to-run examples.

Examples include:

Blink

Traffic Light

RGB

Servo

LCD

OLED

Bluetooth

WiFi

RFID

Ultrasonic

DHT

NeoPixel

Joystick

Motor Driver

Robot Car

Line Follower

Obstacle Avoidance

Weather Station

IoT Dashboard

Smart Home

---

# Architecture

Frontend

React

TypeScript

Vite

Blockly

Tailwind

Capacitor

Backend

Arduino CLI

USB Serial

Future Cloud API

Code should be modular.

Avoid giant files.

Prefer reusable components.

---

# Performance

Lazy Loading

Virtual Rendering

Memoization

Code Splitting

Tree Shaking

No unnecessary renders.

---

# Design System

Material 3

Responsive

Dark Mode

Light Mode

Accessible

Animations

Consistent spacing

Reusable components

---

# Development Rules

Never rewrite working code unnecessarily.

Never duplicate logic.

Keep components small.

Keep functions focused.

Document every major module.

Every feature must be tested before moving to the next.

---

# Roadmap

Phase 1

Core Blockly

Project Manager

Upload

Serial Monitor

Phase 2

All Arduino Blocks

Examples

Libraries

Phase 3

ESP32

Bluetooth

WiFi

OTA

Phase 4

AI Blocks

Cloud

Machine Learning

Speech

Camera

Phase 5

Community

Cloud Sync

Marketplace

Extensions

---

# Definition of Done

A task is complete only when:

✓ Feature implemented

✓ UI polished

✓ Responsive

✓ No TypeScript errors

✓ No ESLint errors

✓ Tested

✓ Documented

✓ Integrated

✓ No duplicated code

---

# AI Agent Instructions

Before writing code:

1. Read this file completely.

2. Read the existing project.

3. Understand the architecture.

4. Find the next unfinished task.

5. Implement only that task.

6. Verify it.

7. Update documentation.

8. Commit changes.

9. Continue with the next task.

Never skip steps.

Never rewrite unrelated code.

Always preserve project consistency.
