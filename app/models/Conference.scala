// Copyright © 2014, German Neuroinformatics Node (G-Node)
//                   A. Stoewer (adrian.stoewer@rz.ifi.lmu.de)
//
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted under the terms of the BSD License. See
// LICENSE file in the root of the Project.

package models

import java.util.{List => JList, LinkedList => JLinkedList}
import javax.persistence.{JoinTable, OneToMany, Entity}

/**
 * A model for that represents a conference.
 *
 * Comment: there could be allot more information about a conference, but
 * maybe we should keep it simple for now.
 */
@Entity
class Conference extends Model {

  var name: String = _

  @OneToMany
  @JoinTable(name = "conference_owners")
  var owners: JList[Account] = new JLinkedList[Account]()
  @OneToMany(mappedBy = "conference")
  var abstracts: JList[Abstract] = new JLinkedList[Abstract]()

}

object Conference {

  def apply() : Conference = new Conference()

  def apply(uuid: String,
            name: String,
            owners: JList[Account] = null,
            abstracts: JList[Abstract] = null) : Conference = {

    val conference = new Conference()

    conference.uuid = uuid
    conference.name = name

    if (owners != null)
      conference.owners = owners

    if (abstracts != null)
      conference.abstracts = abstracts

    conference
  }

}
