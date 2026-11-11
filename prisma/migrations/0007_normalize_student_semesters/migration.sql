-- Normalize recognized student semester values only. Unrecognized values are preserved.
UPDATE "QuizAttempt" SET "semester" = CASE
  WHEN lower(trim("semester")) IN ('1', '1 semester', 'semester 1', '1st', '1st semester', 'semester 1st', 'one', 'one semester', 'semester one') THEN '1'
  WHEN lower(trim("semester")) IN ('2', '2 semester', 'semester 2', '2nd', '2nd semester', 'semester 2nd', 'two', 'two semester', 'semester two') THEN '2'
  WHEN lower(trim("semester")) IN ('3', '3 semester', 'semester 3', '3rd', '3rd semester', 'semester 3rd', 'three', 'three semester', 'semester three') THEN '3'
  WHEN lower(trim("semester")) IN ('4', '4 semester', 'semester 4', '4th', '4th semester', 'semester 4th', 'four', 'four semester', 'semester four') THEN '4'
  WHEN lower(trim("semester")) IN ('5', '5 semester', 'semester 5', '5th', '5th semester', 'semester 5th', 'five', 'five semester', 'semester five') THEN '5'
  WHEN lower(trim("semester")) IN ('6', '6 semester', 'semester 6', '6th', '6th semester', 'semester 6th', 'six', 'six semester', 'semester six') THEN '6'
  WHEN lower(trim("semester")) IN ('7', '7 semester', 'semester 7', '7th', '7th semester', 'semester 7th', 'seven', 'seven semester', 'semester seven') THEN '7'
  WHEN lower(trim("semester")) IN ('8', '8 semester', 'semester 8', '8th', '8th semester', 'semester 8th', 'eight', 'eight semester', 'semester eight') THEN '8'
  WHEN lower(trim("semester")) IN ('9', '9 semester', 'semester 9', '9th', '9th semester', 'semester 9th', 'nine', 'nine semester', 'semester nine') THEN '9'
  WHEN lower(trim("semester")) IN ('10', '10 semester', 'semester 10', '10th', '10th semester', 'semester 10th', 'ten', 'ten semester', 'semester ten') THEN '10'
  WHEN lower(trim("semester")) IN ('11', '11 semester', 'semester 11', '11th', '11th semester', 'semester 11th', 'eleven', 'eleven semester', 'semester eleven') THEN '11'
  WHEN lower(trim("semester")) IN ('12', '12 semester', 'semester 12', '12th', '12th semester', 'semester 12th', 'twelve', 'twelve semester', 'semester twelve') THEN '12'
  WHEN lower(trim("semester")) IN ('13', '13 semester', 'semester 13', '13th', '13th semester', 'semester 13th', 'thirteen', 'thirteen semester', 'semester thirteen') THEN '13'
  WHEN lower(trim("semester")) IN ('14', '14 semester', 'semester 14', '14th', '14th semester', 'semester 14th', 'fourteen', 'fourteen semester', 'semester fourteen') THEN '14'
  WHEN lower(trim("semester")) IN ('15', '15 semester', 'semester 15', '15th', '15th semester', 'semester 15th', 'fifteen', 'fifteen semester', 'semester fifteen') THEN '15'
  WHEN lower(trim("semester")) IN ('16', '16 semester', 'semester 16', '16th', '16th semester', 'semester 16th', 'sixteen', 'sixteen semester', 'semester sixteen') THEN '16'
  WHEN lower(trim("semester")) IN ('17', '17 semester', 'semester 17', '17th', '17th semester', 'semester 17th', 'seventeen', 'seventeen semester', 'semester seventeen') THEN '17'
  WHEN lower(trim("semester")) IN ('18', '18 semester', 'semester 18', '18th', '18th semester', 'semester 18th', 'eighteen', 'eighteen semester', 'semester eighteen') THEN '18'
  WHEN lower(trim("semester")) IN ('19', '19 semester', 'semester 19', '19th', '19th semester', 'semester 19th', 'nineteen', 'nineteen semester', 'semester nineteen') THEN '19'
  WHEN lower(trim("semester")) IN ('20', '20 semester', 'semester 20', '20th', '20th semester', 'semester 20th', 'twenty', 'twenty semester', 'semester twenty') THEN '20'
  ELSE "semester" END;

