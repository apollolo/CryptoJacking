# Proposal Feedback

## What is the project

Simulating mining will not be sufficient. Actual mining must happen. You do not have to write your own miner. Feel free to chose any publicly available miner implementation and adjust/modify it such that it evades contemporary detection systems.

The interesting aspect of the project is to identify the threshold (along multiple dimensions) at which the detection system no longer detects the miner. Note that this means that the detection system must be able to detect the miner if it's not modified.

## How do you plan on tackling the project?

### April 5

"Come up with evasion methods for detection mechanisms in the papers."

It seems premature to assume that you can simply come up with mechanisms that evade detection mechanisms that you only know from their description in papers (especially since you mentioned above that you are not experts on mining or detection thereof already).

Instead a more logical first step would be to identify and obtain a detection system (D) and a miner (M) such that D can detect M in its normal operation.

Once the foundation is set, you can start building on it.

### April 12

"Implement open-source detection methods, starting with Minesweeper and CMTracker,
and begin testing mining script"

This should be part of the first week. Furthermore, this step is counter-intuitive. If the detection method is open-source, you don't have to implement anything, you just have to get it to run. If it is not open-source, it's presumptuous to assume that you can implement it from a paper description in a week.

For the mid-epoch presentation you should at least have a detection system running and demonstrate how it detects a crypto miner.

### April 19

"Implement additional detection methods"

I would stay away from this direction. As mentioned above the essential question is where the thresholds of detection are.

"Continue to modify our mining script to evade detection"

Again, the main goal is to identify the thresholds, it is concerning that this is the very last task in the entire timeline. Any delay to your proposed schedule will imply that the essential question will not be answered, with the corresponding effects on grades.

# What will the demo be?
