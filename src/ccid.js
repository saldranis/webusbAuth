/**
 * Integrated Circuit(s) Cards Interface Devices (CCID) specific parts
 * - first stateless, then having the option to extend it to a state containing class
 * - for reference see openct src/ifd/ifd-ccid.c
 * @type {[type]}
 *
 * Copyright (C) 2017, Jan Birkholz <jbirkhol@informatik.hu-berlin.de>
 */

let currentbSeq = 0x00;
let getbSeq = () => {
  let bSeq = currentbSeq;
  if(currentbSeq===255)
    currentbSeq=0x00;
    else
    currentbSeq++;
  return bSeq;
};

/**
* CCID Message Factory
* @param {Number} bMessageType - CCID Message Type
* @param {Uint8Array} abMessageSpecificHeader - Byte 8-10
* @param {Uint8Array} abData - message body
* @returns {Uint8Array} CCID message to send to reader
*/
function buildCcidMessage (bMessageType, abMessageSpecificHeader, abData) {
  let abDataLength = typeof abData !=='undefined' ? abData.length : 0;

  //let header = ccidMessageHeader(bMessageType, abDataLength, abMessageSpecificHeader);
  //set slot and sequence according to global config. TODO find better implementation
  let header = new Uint8Array(10);
  header.set([bMessageType],0);  //bMessageType (1)
  header.set(number2Uint8Array(abDataLength,true),1);  //dwLength (4) of additional data
  header.set([0x00],5);  //slotNumber (1)
  header.set([getbSeq()],6);  //sequenceNumber (1)
  if(typeof abMessageSpecificHeader !== 'undefined') header.set(abMessageSpecificHeader,7); //message specific bytes (3) OR status (1), error (1), message specific (1)

  let msg = new Uint8Array(header.length+abDataLength);
  msg.set(header,0);
  if(typeof(abData)!=='undefined') msg.set(abData, header.length);
  return msg;
}

/**
* supported CCID Messages
*/
let ccidMessageTypes = {
  //PC_to_RDR
  PC_to_RDR_IccPowerOn: 0x62,
  PC_to_RDR_IccPowerOff: 0x63,
  PC_to_RDR_GetSlotStatus: 0x65,
  PC_to_RDR_XfrBlock: 0x6F,
  PC_to_RDR_GetParameters: 0x6C,
  PC_to_RDR_ResetParameters: 0x6D,
  PC_to_RDR_SetParameters: 0x61,
  PC_to_RDR_Escape: 0x6B,
  PC_to_RDR_IccClock: 0x6E,
  PC_to_RDR_T0APDU: 0x6A,
  PC_to_RDR_Secure: 0x69,
  PC_to_RDR_Mechanical: 0x71,
  PC_to_RDR_Abort: 0x72,
  PC_to_RDR_SetDataRateAndClockFrequency: 0x73,
  //RDR_to_PC
  RDR_to_PC_DataBlock: 0x80,
  RDR_to_PC_SlotStatus: 0x81,
  RDR_to_PC_Parameters: 0x82,
  RDR_to_PC_Escape: 0x83,
  RDR_to_PC_DataRateAndClockFrequency: 0x84,
    //Interrupt-IN
  RDR_to_PC_NotifySlotChange: 0x50,
  RDR_to_PC_HardwareError: 0x51
};

/**
 * Converts a Number <2^32 to its ByteArray representation.
 * - has to be used for using a number in a ByteArray, otherwise only smallest Byte gets copied in ByteArray
 * - alternatively use a DataView on ArrayBuffer in combination with get/SetDataType
 * @param  {Number} number       <=2^32
 * @param  {Boolean} littleEndian - order of bytes starting with little end. Otherwise Big Endian.
 * @return {Uint8Array}           - Array of Bytes, encoding given number
 */
function number2Uint8Array (number, littleEndian = true) {
  if(number >= Math.pow(2,32)) throw new Error("Number is too large for conversion using >> operator.");
  let numberBytes = (number) => {
    var bits = Math.ceil(Math.log2(number+1)); //+1 because starting with zero
    var bytes = Math.ceil(bits/8);
    return bytes;
  };
  let uint8Array = new Uint8Array(numberBytes(number));

  //fill array according to endianess
  if(littleEndian) {
    for(let i =0;i<uint8Array.length;i++) { //shifting gives big endian encoded number
      uint8Array[i] = (number >>(8*i))&0xFF;
    }
  } else {
    for(let i =0;i<uint8Array.length;i++) { //shifting gives big endian encoded number
      uint8Array[uint8Array.length-1-i] = (number >>(8*i))&0xFF; //only save last byte
    }
  }
  return uint8Array;
}

/**
 * Convert decimal number to 2/4 Byte little endian encoded equivalent.
 *   The underlying bit value is changed accordingly, which may have a different
 *   number representation depending on your cpu architecture.
 * @param  {Number} number     positive number <2^32
 * @param  {Number} byteLength length in bytes of underlying bit value
 * @return {Number}            little endian converted value
 */
function number2LittleEndianWord(number, byteLength) {
  if(number >= Math.pow(2,32)) throw new Error("Number is too large for conversion using >> operator.");
  let arrayBuffer = new ArrayBuffer(byteLength);
  let dataView = new DataView(arrayBuffer);
  switch(byteLength) {
    case 2:
      dataView.setUint16(0,number,true);
      return dataView.getUint16(0,false);
      break;
    case 4:
      dataView.setUint32(0,number,true);
      return dataView.getUint32(0,false);
      break;
    default:
      throw new Error("2 and 4 Byte length only.");
    break;
  }
  return null;
}

/**
 * create/parse ccid messages
 * @type {Object}
 */
let ccidMessages = { //TODO: do input checks
PC_to_RDR_IccPowerOn: (bPowerSelect) => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_IccPowerOn);
},
PC_to_RDR_IccPowerOff: () => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_IccPowerOff);
},
PC_to_RDR_GetSlotStatus: () => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_GetSlotStatus);
},
PC_to_RDR_XfrBlock: (bBWI,wLevelParameter,abData) => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_XfrBlock,undefined,abData);
},
PC_to_RDR_GetParameters: () => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_GetParameters);
},
PC_to_RDR_ResetParameters: () => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_ResetParameters);
},
PC_to_RDR_SetParameters: (bProtocolNum, abProtocolDataStructure) => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_SetParameters,new Uint8Array([bProtocolNum,0x00,0x00]),abProtocolDataStructure);
},
PC_to_RDR_Escape: (abData) => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_Escape,undefined,abData);
},
PC_to_RDR_IccClock: (bClockCommand) => { //stops clock per default
  let restartClock = bClockCommand==true ? 0x00 : 0x01;
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_T0APDU, new Uint8Array([restartClock,0x00,0x00]));
},
PC_to_RDR_T0APDU: (bmChanges, bClassGetResponse, bClassEnvelope) => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_IccClock, new Uint8Array([bmChanges,bClassGetResponse,bClassEnvelope]));
},
PC_to_RDR_Secure: (bBWI, wLevelParameter, abData) => { //PIN verification/modification
  let wLevelParameterUint8Array = number2Uint8Array(wLevelParameter,true);
  let abMsgSpecificHeader = new Uint8Array(3);
  abMsgSpecificHeader.set([bBWI],0)
  abMsgSpecificHeader.set(wLevelParameterUint8Array,1);
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_Secure, abMsgSpecificHeader,abData);
},
PC_to_RDR_Mechanical: (bFunction) => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_Mechanical, new Uint8Array([bFunction,0x00,0x00]));
},
PC_to_RDR_Abort: () => {
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_Abort);
},
PC_to_RDR_SetDataRateAndClockFrequency: (dwClockFrequency,dwDataRate) => {
  let abData = new Uint8Array(8);
  abData.set(number2Uint8Array(dwClockFrequency),0);
  abData.set(number2Uint8Array(dwDataRate),4);
  return buildCcidMessage(ccidMessageTypes.PC_to_RDR_SetDataRateAndClockFrequency, undefined,abData);
},
//RDR_to_PC
RDR_to_PC_DataBlock: (arrayBuffer) => { //
  let ccidHeaderObject = defaultCcidHeader(arrayBuffer);
  let bChainParameter = ccidHeader.getUint8(9);
  let abData = arrayBuffer.slice(10);
  return abData;
},
RDR_to_PC_SlotStatus: (arrayBuffer) => {
  let ccidHeader = defaultCcidHeader(arrayBuffer);
  let bClockStatus = ccidHeader.getUint8(9);
  return bClockStatus;
},
RDR_to_PC_Parameters: (arrayBuffer) => {
  let ccidHeader = defaultCcidHeader(arrayBuffer);
  let bProtocolNum = ccidHeader.getUint8(9);
  let abProtocolDataStructure = arrayBuffer.slice(10);
  return abProtocolDataStructure;
},
RDR_to_PC_Escape: (arrayBuffer) => {
  let ccidHeader = defaultCcidHeader(arrayBuffer);
  let abData = arrayBuffer.slice(10);
  return abData;
},
RDR_to_PC_DataRateAndClockFrequency: (arrayBuffer) => {
  let ccidHeader = defaultCcidHeader(arrayBuffer);
  let abDataDataView = new DataView(arrayBuffer,10,8);
  let dwClockFrequency = abDataDataView.getUint32(0);
  let dwDataRate = abDataDataView.getUint32(5);
  return {
    dwClockFrequency:dwClockFrequency,
    dwDataRate:dwDataRate
  };
},
//Interrupt-IN
RDR_to_PC_NotifySlotChange: (arrayBuffer) => {
  let bMessageType = new DataView(arrayBuffer,0,1).getUint8();
  let bmSlotICCState = arrayBuffer.slice(1);
  return bmSlotICCState;
},
RDR_to_PC_HardwareError: (arrayBuffer) => {
  let ccidHeader = new DataView(arrayBuffer,0,4);
  let bMessageType = ccidHeader.getUint8(0);
  let bSlot = ccidHeader.getUint8(1);
  let bSeq = ccidHeader.getUint8(2);
  let bHardwareErrorCode = ccidHeader.getUint8(3);
  return {
    bSlot:bSlot,
    bSeq:bSeq,
    bHardwareErrorCode:bHardwareErrorCode
  };
},
};

//basic check for each
function defaultCcidHeader (arrayBuffer) { //TODO: do bStatus,bError checks
  let ccidHeader = new DataView(arrayBuffer,0,10);
  let bMessageType = ccidHeader.getUint8(0);
  let dwLength = ccidHeader.getUint32(1);
  let bSlot = ccidHeader.getUint8(5);
  let bSeq = ccidHeader.getUint8(6);
  let bStatus = ccidHeader.getUint8(7);
  let bError = ccidHeader.getUint8(8);
  let bMsgSpecificHeader = ccidHeader.getUint8(9);
  return {
    bMessageType:bMessageType,
    dwLength:dwLength,
    bSlot:bSlot,
    bSeq:bSeq,
    bStatus:bStatus,
    bError:bError,
    bMsgSpecificHeader:bMsgSpecificHeader
  };
}

/**
 * Parse Smart Card Interface Descriptor data
 * - non CCID device will throw error
 * @param  {ArrayBuffer} arrayBufferResult - Configuration Descriptor raw data.
 * @return {Array<Object>}                 - Parsed Interface Descriptors containing Smart Card Class Descriptor data.
 */
function parseConfigurationDescriptor(arrayBufferResult) {
//configuration descriptor
let configurationDataView = new DataView(arrayBufferResult);
let configurationbLength = configurationDataView.getUint8(0); //for parsing objects
let configurationbDescriptorType = configurationDataView.getUint8(1); //must be 2
let configurationwTotalLength = configurationDataView.getUint16(2,true); //check against length
let configurationbNumInterfaces = configurationDataView.getUint8(4);

if(configurationbDescriptorType!==0x02) throw new Error("Received Descriptor Data is not Interface Descriptor");
if(configurationwTotalLength!==configurationDataView.byteLength) throw new Error("Received Configuration Descriptor data missing. Length mismatch.")

//find smart card class interface descriptors' indices in raw configration descriptor data
let getSmartCardInterfaceDescriptorIndices = (dataView,numInterfaces) => {
  let SmartCardInterfaceDescriptorsIndices = [];
  let i=0;
  while(i<dataView.byteLength) {
    let descriptorType = dataView.getUint8(i+1);
    let bInterfaceClass = dataView.getUint8(i+5);
    if(descriptorType==0x04 && bInterfaceClass == 0x0B) { //Interface descriptor, Smart Card Class
      SmartCardInterfaceDescriptorsIndices.push(i);
      if(SmartCardInterfaceDescriptorsIndices.length === numInterfaces) break; //we have what we want
    }

    //move to next element
    let nextDescriptorElementIndex = dataView.getUint8(i) + i;
    i = nextDescriptorElementIndex;
  }
  return SmartCardInterfaceDescriptorsIndices;
};

let SmartCardInterfaceDescriptorsIndices = getSmartCardInterfaceDescriptorIndices(configurationDataView,configurationbNumInterfaces);
if(SmartCardInterfaceDescriptorsIndices.length!==configurationbNumInterfaces) throw new Error("Not all interfaces found. Is descriptor data corrupt?")
if(SmartCardInterfaceDescriptorsIndices.length===0) throw new Error("Device is no USB Smart Card Class Device (CCID).");

//parse found interface raw data into readable objects. See CCID Standard.
let parseSmartCardInterfaceDescriptors = (dataView,SmartCardInterfaceDescriptorsIndices) => {
  if(SmartCardInterfaceDescriptorsIndices.length===0) return [];
  let parseSmartCardDescriptor = (dataView,smartCardClassDescriptorIndex) => {
    let classDescriptor = {
      bLength: dataView.getUint8(smartCardClassDescriptorIndex),
      bDescriptorType: dataView.getUint8(smartCardClassDescriptorIndex+1),
      bcdCCID: dataView.getUint16(smartCardClassDescriptorIndex+2,true),
      bMaxSlotIndex: dataView.getUint8(smartCardClassDescriptorIndex+4),
      bVoltageSupport: dataView.getUint8(smartCardClassDescriptorIndex+5),
      dwProtocols: dataView.getUint32(smartCardClassDescriptorIndex+6,true),
      dwDefaultClock: dataView.getUint32(smartCardClassDescriptorIndex+10,true),
      dwMaximumClock: dataView.getUint32(smartCardClassDescriptorIndex+14,true),
      bNumClockSupported: dataView.getUint8(smartCardClassDescriptorIndex+18),
      dwDataRate: dataView.getUint32(smartCardClassDescriptorIndex+19,true),
      dwMaxDataRate: dataView.getUint32(smartCardClassDescriptorIndex+23,true),
      bNumDataRatesSupported: dataView.getUint8(smartCardClassDescriptorIndex+27),
      dwMaxIFSD: dataView.getUint32(smartCardClassDescriptorIndex+28,true),
      dwSynchProtocols: dataView.getUint32(smartCardClassDescriptorIndex+32,true),
      dwMechanical: dataView.getUint32(smartCardClassDescriptorIndex+36,true),
      dwFeatures: dataView.getUint32(smartCardClassDescriptorIndex+40,true),
      dwMaxCCIDMessageLength: dataView.getUint32(smartCardClassDescriptorIndex+44,true),
      bClassGetResponse: dataView.getUint8(smartCardClassDescriptorIndex+48),
      bClassEnvelope: dataView.getUint8(smartCardClassDescriptorIndex+49),
      wLcdLayout: dataView.getUint16(smartCardClassDescriptorIndex+50,true),
      bPINSupport: dataView.getUint8(smartCardClassDescriptorIndex+52),
      bMaxCCIDBusySlots: dataView.getUint8(smartCardClassDescriptorIndex+53)
    };
    return classDescriptor;
  };

  let parseInterfaceDescriptor = (dataView,smartCardInterfaceDescriptorIndex) => {
    let interfaceDescriptor = {
      bLength: dataView.getUint8(smartCardInterfaceDescriptorIndex),
      bDescriptorType: dataView.getUint8(smartCardInterfaceDescriptorIndex+1),
      bInterfaceNumber: dataView.getUint8(smartCardInterfaceDescriptorIndex+2),
      bAlternateSetting: dataView.getUint8(smartCardInterfaceDescriptorIndex+3),
      bNumEndpoints: dataView.getUint8(smartCardInterfaceDescriptorIndex+4),
      bInterfaceClass: dataView.getUint8(smartCardInterfaceDescriptorIndex+5),
      bInterfaceSubClass: dataView.getUint8(smartCardInterfaceDescriptorIndex+6),
      bInterfaceProtocol: dataView.getUint8(smartCardInterfaceDescriptorIndex+7),
      iInterface: dataView.getUint8(smartCardInterfaceDescriptorIndex+8), //index is not replaced with string itself
    };
    return interfaceDescriptor;
  };

  //combine descriptor data
  let interfaceDescriptors = [];
  for(let i=0;i<SmartCardInterfaceDescriptorsIndices.length;i++) {
    let smartCardInterfaceDescriptorIndex = SmartCardInterfaceDescriptorsIndices[i];
    let smartCardClassDescriptorIndex = smartCardInterfaceDescriptorIndex + dataView.getUint8(smartCardInterfaceDescriptorIndex);

    let interfaceDescriptor = parseInterfaceDescriptor(dataView,smartCardInterfaceDescriptorIndex);
    interfaceDescriptor.SmartCardClassDescriptor = parseSmartCardDescriptor(dataView, smartCardClassDescriptorIndex);
    interfaceDescriptors.push(interfaceDescriptor);
  }
  return interfaceDescriptors;
};

let interfaceDescriptors = parseSmartCardInterfaceDescriptors(configurationDataView,SmartCardInterfaceDescriptorsIndices);
return interfaceDescriptors;
}

//TODO: implement CCID handler (doing send and receive)
//TODO: implement response checker (status and error bytes), outputting errors

//TODO: check reader dwFeatures if it has autovoltage, autobaud, ... since we do not manually configure


export {ccidMessages, parseConfigurationDescriptor};