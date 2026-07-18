# NewBegin Makes — Blockly Specification

## Goal

Implement a Blockly environment comparable to PictoBlox.

Every block should generate clean Arduino C++ code.

Blocks should be grouped into categories.

---

# Categories

## Events

* Arduino Starts
* Forever
* When Button Pressed
* Timer
* Broadcast
* Receive Broadcast

---

## Control

* If
* If Else
* Repeat
* Forever
* While
* Repeat Until
* Wait
* Stop

---

## Operators

* Math
* Logic
* Random
* Comparison
* Boolean
* Text
* Join
* Modulo

---

## Variables

* Create Variable
* Set Variable
* Change Variable

---

## Lists

Complete Blockly list support.

---

## Functions

Custom procedures.

Return values.

Arguments.

---

## Arduino

Digital Write

Digital Read

Analog Read

Analog Write

PWM

Interrupt

Delay

Millis

Micros

Tone

NoTone

ShiftIn

ShiftOut

PulseIn

---

## Communication

Serial

I2C

SPI

UART

Bluetooth

WiFi

HTTP

MQTT

Firebase

---

## Sensors

DHT

BMP280

Ultrasonic

IR

PIR

Flame

Gas

Rain

Touch

Joystick

LDR

Soil Moisture

Hall Sensor

RFID RC522

MPU6050

Compass

GPS

---

## Displays

LCD 16x2

OLED SSD1306

MAX7219

NeoPixel

Seven Segment

---

## Actuators

Servo

DC Motor

Stepper

Relay

Buzzer

RGB LED

Fan

Pump

---

## AI

Speech Recognition

Speech Synthesis

Image Classification

Face Detection

Face Recognition

Object Detection

Gesture Recognition

Camera

Gemini Integration

OpenAI Integration

---

# Block Requirements

Each block must define:

* Blockly JSON
* UI
* Inputs
* Outputs
* Arduino Generator
* Validation
* Tooltip
* Documentation
* Example

---

# Generator Rules

Generated Arduino code must:

* Be readable.
* Be formatted.
* Avoid duplicate includes.
* Avoid duplicate variables.
* Avoid duplicate setup code.
* Produce valid Arduino C++.

---

# Extension System

Support third-party block packages.

Allow custom categories.

Allow importing/exporting block libraries.
