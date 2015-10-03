cmake_minimum_required(VERSION 2.8)

# Name of the project (will be the name of the plugin)
project(usb)

set(CMAKE_MACOSX_RPATH 1)

# Essential include files to build a node fsio,
# you should add this line in every CMake.js based project.

if (CMAKE_JS_INC)
  include_directories(${CMAKE_JS_INC})
else ()
  include_directories(/Users/taoyuan/.cmake-js/node-x64/v0.10.40/src)
  include_directories(/Users/taoyuan/.cmake-js/node-x64/v0.10.40/deps/v8/include)
  include_directories(/Users/taoyuan/.cmake-js/node-x64/v0.10.40/deps/uv/include)
#  include_directories(/usr/local/include/node)
  include_directories(node_modules/nan)
  include_directories(libusb/libusb)
  include_directories(libusb/libusb/os)
endif ()

# Declare the source files location
file(GLOB SOURCE_FILES "src/*.cc" "src/*.h")

# This line will tell CMake that we're building a shared library
# from the above source files
# named after the project's name
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})

# This line will give our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# Essential library files to link to a node fsio,
# you should add this line in every CMake.js based project.
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})
